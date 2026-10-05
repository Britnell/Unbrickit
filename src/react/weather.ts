export interface CurrentWeather {
  temperature: number;
  weatherCode: number;
  weatherText: string;
  weatherEmoji: string;
  windSpeed: number;
  humidity: number;
  pressure: number;
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
export enum WeatherCode {
  Clear = 0,
  MainlyClear = 1,
  PartlyCloudy = 2,
  Overcast = 3,
  Fog = 45,
  RimeFog = 48,
  LightDrizzle = 51,
  Drizzle = 53,
  HeavyDrizzle = 55,
  LightFreezingDrizzle = 56,
  FreezingDrizzle = 57,
  LightRain = 61,
  Rain = 63,
  HeavyRain = 65,
  LightFreezingRain = 66,
  FreezingRain = 67,
  LightSnowfall = 71,
  Snowfall = 73,
  HeavySnowfall = 75,
  SnowGrains = 77,
  LightRainShowers = 80,
  RainShowers = 81,
  HeavyRainShowers = 82,
  LightSnowShowers = 85,
  HeavySnowShowers = 86,
  Thunderstorm = 95,
  ThunderstormLightHail = 96,
  ThunderstormHeavyHail = 99,
}

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
    `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,surface_pressure&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);
  const data = await res.json();
  return {
    temperature: data.current.temperature_2m,
    weatherCode: data.current.weather_code,
    weatherText: weatherCodeText(data.current.weather_code),
    weatherEmoji: weatherCodeEmoji(data.current.weather_code),
    windSpeed: data.current.wind_speed_10m,
    humidity: data.current.relative_humidity_2m,
    pressure: data.current.surface_pressure,
  };
}
