import { useEffect, useState } from "react";
import { searchCities, getWeather, type GeoResult, type CurrentWeather } from "./weather";
import { useLocalStorage } from "./useLocalStorage";

export interface StoredLocation {
  name: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export default function WeatherPage() {
  const [location, setLocation] = useLocalStorage<StoredLocation | null>(
    "weatherLocation",
    null,
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<CurrentWeather | null>(null);

  // fetch weather for the stored location
  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    getWeather(location)
      .then((w) => !cancelled && setWeather(w))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [location]);

  const search = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const hits = await searchCities(query);
      if (hits.length === 0) setError(`City not found: ${query}`);
      setResults(hits);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  };

  const select = (r: GeoResult) => {
    setLocation({
      name: r.name,
      country: r.country,
      latitude: r.latitude,
      longitude: r.longitude,
    });
    setResults(null);
    setQuery("");
  };

  const clear = () => {
    setLocation(null);
    setWeather(null);
  };

  // stored location -> show raw weather
  if (location) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span>
            {location.name}
            {location.country ? `, ${location.country}` : ""}
          </span>
          <button className="button" onClick={clear}>
            -
          </button>
        </div>
        {error && <div className="text-red-600">{error}</div>}
        {weather && (
          <div className="flex items-center justify-center gap-4">
            <span className="text-7xl">
              {weather.weatherEmoji}
              {weather.windSpeed > 30 && "💨"}
            </span>
            <span className="text-7xl font-bold">
              {Math.round(weather.temperature)}°
            </span>
          </div>
        )}
      </div>
    );
  }

  // no location -> search UI
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          className="border border-black/30 rounded px-2 py-1 flex-1 min-w-0"
          placeholder="City name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button className="button" onClick={search} disabled={busy}>
          {busy ? "…" : "Search"}
        </button>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      {results?.map((r) => (
        <button
          key={`${r.latitude},${r.longitude}`}
          className="button text-left w-full"
          onClick={() => select(r)}
        >
          {r.name}
          {r.country ? `, ${r.country}` : ""}
        </button>
      ))}
    </div>
  );
}
