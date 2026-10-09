import { atom, getDefaultStore, useAtom, useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const stations = {
  NTS: "http://stream-relay-geo.ntslive.net/stream",
  "Worldwide FM": "https://worldwide-fm.radiocult.fm/stream",
  "KEXP Seattle": "https://kexp.streamguys1.com/kexp64.aac",
  FM4: "https://orf-live.ors-shoutcast.at/fm4-q1a",
  NPR: "https://npr-ice.streamguys1.com/live.mp3",
} as const;

const firstStation = Object.keys(stations)[0];

/** last selected station, persisted to localStorage.
 *  atomWithStorage loads the saved value once at startup and
 *  writes back on every change. */
export const selectedRadioStationAtom = atomWithStorage(
  "selectedStation",
  firstStation,
);
/** true while the radio is playing */
export const playingRadioAtom = atom(false);
/** name of the currently playing radio station */
export const playingRadioStationAtom = atom<string | null>(null);

/** single global audio element so playback survives menu close.
 *  kept on window so Vite HMR reuses the same element instead of
 *  creating a second one and double-playing. */
const globalRadio = window as typeof window & {
  __radioAudio?: HTMLAudioElement;
};
export const radioAudio = (globalRadio.__radioAudio ??= new Audio());
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

function playStation(name: string) {
  const url = stations[name as keyof typeof stations];
  if (!url) return;

  const current = new URL(radioAudio.src, location.href).href;
  if (current !== url) {
    radioAudio.pause();
    radioAudio.src = url;
  }
  store.set(playingRadioStationAtom, name);
  return radioAudio.play().catch(() => {
    radioAudio.pause();
    store.set(playingRadioStationAtom, null);
  });
}

/** play the user's selected station (default: first in the list) */
export function startRadio() {
  return playStation(store.get(selectedRadioStationAtom));
}

export function stopRadio() {
  radioAudio.pause();
  radioAudio.removeAttribute("src");
  radioAudio.load();
  // reset state directly: the pause event doesn't fire reliably
  // when the element is stuck buffering a stalled stream
  store.set(playingRadioAtom, false);
  store.set(playingRadioStationAtom, null);
}

/** radio state + controls for the UI */
export function useRadio() {
  const [selected, setSelected] = useAtom(selectedRadioStationAtom);
  const playing = useAtomValue(playingRadioAtom);
  const playingStation = useAtomValue(playingRadioStationAtom);

  /** pick a station; auto-tunes if the radio is already playing */
  const select = (name: string) => {
    setSelected(name);
    if (playing) playStation(name);
  };

  return { selected, select, playing, playingStation, start: startRadio, stop: stopRadio };
}
