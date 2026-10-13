export interface CurrentWeather {
  temperature: number;
  weatherCode: number;
  weatherText: string;
  weatherEmoji: string;
  windSpeed: number;
  daily: DailyForecast;
}

export interface DailyForecast {
  tempMax: number;
  tempMin: number;
  rainProbMax: number; // 0-100, highest hourly chance today
  rainHours: number; // hours from now with rain chance >= 30%
}

export interface GeoResult {
  name: string;
  country?: string;
  latitude: number;
  longitude: number;
}

// Search for a city by name, returns up to 3 matches.
export async function searchCities(city: string): Promise<GeoResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=3`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).map((r: any) => ({
    name: r.name,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

// Get current weather for known coords (no geocoding).
// WMO weather interpretation codes
export const WeatherCode = {
  Clear: 0,
  MainlyClear: 1,
  PartlyCloudy: 2,
  Overcast: 3,
  Fog: 45,
  RimeFog: 48,
  LightDrizzle: 51,
  Drizzle: 53,
  HeavyDrizzle: 55,
  LightFreezingDrizzle: 56,
  FreezingDrizzle: 57,
  LightRain: 61,
  Rain: 63,
  HeavyRain: 65,
  LightFreezingRain: 66,
  FreezingRain: 67,
  LightSnowfall: 71,
  Snowfall: 73,
  HeavySnowfall: 75,
  SnowGrains: 77,
  LightRainShowers: 80,
  RainShowers: 81,
  HeavyRainShowers: 82,
  LightSnowShowers: 85,
  HeavySnowShowers: 86,
  Thunderstorm: 95,
  ThunderstormLightHail: 96,
  ThunderstormHeavyHail: 99,
} as const;

export function weatherCodeText(code: number): string {
  const entry = Object.entries(WeatherCode).find(([, v]) => v === code);
  return entry ? entry[0].replace(/([a-z])([A-Z])/g, "$1 $2") : `Unknown (${code})`;
}

export function weatherCodeEmoji(code: number): string {
  switch (code) {
    case 0: return "☀️";
    case 1: return "🌤️";
    case 2: return "⛅";
    case 3: return "☁️";
    case 45:
    case 48: return "🌫️";
    case 51:
    case 53:
    case 55:
    case 56:
    case 57: return "🌦️";
    case 61:
    case 63:
    case 65:
    case 66:
    case 67: return "🌧️";
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86: return "🌨️";
    case 80:
    case 81:
    case 82: return "🌦️";
    case 95:
    case 96:
    case 99: return "⛈️";
    default: return "❓";
  }
}

export async function getWeather(coords: { latitude: number; longitude: number }): Promise<CurrentWeather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}` +
    `&current=temperature_2m,weather_code,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min` +
    `&hourly=precipitation_probability&forecast_days=1&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);
  const data = await res.json();
  const current = data.current as {
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  const daily = data.daily as {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
  const hourly = data.hourly as { time: string[]; precipitation_probability: number[] };

  const probs = hourly.time
    .map((t, i) => ({ time: new Date(t), prob: hourly.precipitation_probability[i] ?? 0 }))
    .filter((h) => h.time >= new Date());
  const dailyForecast: DailyForecast = {
    tempMax: daily.temperature_2m_max[0],
    tempMin: daily.temperature_2m_min[0],
    rainProbMax: probs.reduce((m, h) => Math.max(m, h.prob), 0),
    rainHours: probs.filter((h) => h.prob >= 30).length,
  };

  return {
    temperature: current.temperature_2m,
    weatherCode: current.weather_code,
    weatherText: weatherCodeText(current.weather_code),
    weatherEmoji: weatherCodeEmoji(current.weather_code),
    windSpeed: current.wind_speed_10m,
    daily: dailyForecast,
  };
}
