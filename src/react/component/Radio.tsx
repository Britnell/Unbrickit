import { useAtom, useAtomValue, getDefaultStore } from "jotai";
import { useLocalStorage } from "../useLocalStorage";
import { PlayIcon, StopIcon } from "./Podcast";
import { playingRadioAtom, playingRadioStationAtom } from "../atoms";

export const stations = {
  NTS: "http://stream-relay-geo.ntslive.net/stream",
  "Worldwide FM": "https://worldwide-fm.radiocult.fm/stream",
  "KEXP Seattle": "https://kexp.streamguys1.com/kexp64.aac",
  FM4: "https://orf-live.ors-shoutcast.at/fm4-q1a",
  NPR: "https://npr-ice.streamguys1.com/live.mp3",
} as const;

/** single global audio element so playback survives menu close.
 *  kept on window so Vite HMR reuses the same element instead of
 *  creating a second one and double-playing. */
const globalRadio = window as typeof window & {
  __radioAudio?: HTMLAudioElement;
};
const radioAudio = (globalRadio.__radioAudio ??= new Audio());
radioAudio.preload = "none";

const store = getDefaultStore();
radioAudio.addEventListener("playing", () =>
  // "playing" = audio actually flowing; "play" fires too early
  // (before the stream has buffered anything) leaving the UI stuck
  store.set(playingRadioAtom, true),
);
radioAudio.addEventListener("pause", () => {
  // streams never "end", so any pause means stopped
  store.set(playingRadioAtom, false);
});
radioAudio.addEventListener("error", () => {
  store.set(playingRadioAtom, false);
  store.set(playingRadioStationAtom, null);
});

export function RadioWidget({ onOpen }: { onOpen: () => void }) {
  const playing = useAtomValue(playingRadioAtom);
  const station = useAtomValue(playingRadioStationAtom);
  if (!playing) return null;
  return (
    <button
      className="button button-glass flex items-center gap-1"
      onClick={onOpen}
      title={station ?? "Radio"}
    >
      📻
      <span className="text-xs">
        <PlayIcon size={12} />
      </span>
    </button>
  );
}

export function RadioPage() {
  const [selectedStation, setSelectedStation] = useLocalStorage(
    "selectedStation",
    Object.keys(stations)[0],
  );
  const playing = useAtomValue(playingRadioAtom);
  const [, setPlayingStation] = useAtom(playingRadioStationAtom);

  const playStation = async (station: string) => {
    const url = stations[station as keyof typeof stations];
    if (!url) return;

    const current = new URL(radioAudio.src, location.href).href;
    if (current !== url) {
      radioAudio.pause();
      radioAudio.src = url;
    }
    setPlayingStation(station);
    try {
      await radioAudio.play();
    } catch {
      radioAudio.pause();
      setPlayingStation(null);
    }
  };

  const stopRadio = () => {
    radioAudio.pause();
    radioAudio.removeAttribute("src");
    radioAudio.load();
    // reset state directly: the pause event doesn't fire reliably
    // when the element is stuck buffering a stalled stream
    store.set(playingRadioAtom, false);
    setPlayingStation(null);
  };

  const changeStation = (name: string) => {
    setSelectedStation(name);
    // auto-play the new station if we're already playing
    if (playing) playStation(name);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        id="radio-select"
        className="col-span-full"
        value={selectedStation}
        onChange={(e) => changeStation(e.target.value)}
      >
        {Object.keys(stations).map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <div className="flex items-center">
        {!playing && <span>Ready</span>}
        {playing && <span>🔴 Live</span>}
      </div>

      <button
        className="button grid place-items-center"
        title={playing ? "Stop" : "Play"}
        onClick={() => (playing ? stopRadio() : playStation(selectedStation))}
      >
        {playing ? <StopIcon /> : <PlayIcon />}
      </button>
    </div>
  );
}

export default RadioPage;
