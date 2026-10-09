import { useAtomValue } from "jotai";
import { PlayIcon, StopIcon } from "./Podcast";
import { playingRadioAtom, playingRadioStationAtom, stations, useRadio } from "../lib/useRadio";

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
  const { selected, select, playing, start, stop } = useRadio();

  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        id="radio-select"
        className="col-span-full"
        value={selected}
        onChange={(e) => select(e.target.value)}
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
        onClick={() => (playing ? stop() : start())}
      >
        {playing ? <StopIcon /> : <PlayIcon />}
      </button>
    </div>
  );
}

export default RadioPage;
