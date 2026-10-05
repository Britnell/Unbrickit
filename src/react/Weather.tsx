import { useEffect, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { searchCities, getWeather, type GeoResult } from "./weather";
import { weatherLocationAtom, weatherAtom, weatherWidgetAtom } from "./atoms";

const WEATHER_UPDATE_MINUTES = 16;

/** global weather fetcher: fetch on location change + refresh every N minutes */
export function useWeatherEngine() {
  const location = useAtomValue(weatherLocationAtom);
  const setWeather = useAtom(weatherAtom)[1];
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    const fetchIt = () =>
      getWeather(location)
        .then((w) => !cancelled && setWeather(w))
        .catch((e) => !cancelled && setError(e.message));
    fetchIt();
    const timer = setInterval(fetchIt, WEATHER_UPDATE_MINUTES * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [location, setWeather]);

  return error;
}

export default function WeatherPage() {
  const [location, setLocation] = useAtom(weatherLocationAtom);
  const [showWidget, setShowWidget] = useAtom(weatherWidgetAtom);
  const weather = useAtomValue(weatherAtom);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  };

  const widgetCheckbox = (
    <label className="flex items-center gap-2 select-none">
      <input
        type="checkbox"
        checked={showWidget}
        onChange={(e) => setShowWidget(e.target.checked)}
      />
      show weather widget
    </label>
  );

  // stored location -> show raw weather
  if (location) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">
            {location.name}
            {location.country ? `, ${location.country}` : ""}
          </span>
          <button className="button" onClick={clear}>
            -
          </button>
        </div>
        {weather && (
          <>
          <div className="flex items-center justify-center gap-4 py-2">
            <span className="text-7xl">
              {weather.weatherEmoji}
              {weather.windSpeed > 30 && "💨"}
            </span>
            <span className="text-7xl font-bold">
              {Math.round(weather.temperature)}°
            </span>
          </div>
          <div className="flex items-center justify-center gap-4 text-xl">
            <span>
              <span className="text-sm text-gray-500">high / low </span>
              {Math.round(weather.daily.tempMax)} / {Math.round(weather.daily.tempMin)}
            </span>
            {weather.daily.rainProbMax >= 30 && (
              <span>🌧️ {weather.daily.rainProbMax}%{weather.daily.rainHours > 0 && ` (${weather.daily.rainHours}h)`}</span>
            )}
          </div>
          </>
        )}
        {widgetCheckbox}
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

/** small corner widget: emoji + temperature */
export function WeatherWidget({ onOpen }: { onOpen: () => void }) {
  const weather = useAtomValue(weatherAtom);
  if (!weather) return null;
  return (
    <button className="button" onClick={onOpen}>
      <span className="flex items-center gap-1">
        <span className="text-lg">{weather.weatherEmoji}</span>
        <span className="font-bold">{Math.round(weather.temperature)}°</span>
      </span>
    </button>
  );
}
