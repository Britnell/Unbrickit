import { useRef, useState } from "react";
import { useLocalStorage } from "./useLocalStorage";

export const stations = {
  NTS: "http://stream-relay-geo.ntslive.net/stream",
  "Worldwide FM": "https://worldwide-fm.radiocult.fm/stream",
  "KEXP Seattle": "https://kexp.streamguys1.com/kexp64.aac",
  FM4: "https://orf-live.ors-shoutcast.at/fm4-q1a",
  NPR: "https://npr-ice.streamguys1.com/live.mp3",
} as const;

export function RadioPage() {
  const [selectedStation, setSelectedStation] = useLocalStorage(
    "selectedStation",
    Object.keys(stations)[0],
  );
  const [playingStation, setPlayingStation] = useState("");
  const [playingRadio, setPlayingRadio] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const radioRef = useRef<HTMLAudioElement | null>(null);

  const stopRadio = () => {
    radioRef.current?.pause();
    setPlayingRadio(false);
  };

  const playRadio = async () => {
    const url = stations[selectedStation as keyof typeof stations];
    if (!url) return;

    try {
      setLoading(true);
      setError("");

      if (!radioRef.current || radioRef.current.src !== url) {
        radioRef.current?.pause();
        const audio = new Audio(url);
        audio.preload = "none";
        audio.addEventListener("error", () => {
          setLoading(false);
          setError("Error loading radio station, try another one or try again");
        });
        audio.addEventListener("ended", () => setPlayingRadio(false));
        radioRef.current = audio;
      }

      await radioRef.current.play();
      setPlayingRadio(true);
      setLoading(false);
      setPlayingStation(selectedStation);
    } catch {
      setLoading(false);
      setPlayingRadio(false);
      setError("Failed to play radio stream. Please try another station.");
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <label htmlFor="radio-select" className="col-span-full">
        Select Radio Station:
      </label>
      <select
        id="radio-select"
        className="col-span-full"
        value={selectedStation}
        onChange={(e) => setSelectedStation(e.target.value)}
      >
        {Object.keys(stations).map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <div>
        {!loading && !playingRadio && <span>Ready</span>}
        {loading && <span>Loading stream...</span>}
        {playingRadio && !loading && <span>🔴 {playingStation} live</span>}
      </div>

      <button
        className="button"
        disabled={loading}
        onClick={() => (playingRadio ? stopRadio() : playRadio())}
      >
        {playingRadio ? "Stop" : "Play"}
      </button>

      {error && <p className="col-span-full">{error}</p>}
    </div>
  );
}

export default RadioPage;
