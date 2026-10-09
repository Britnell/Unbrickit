import { getDefaultStore } from "jotai";
import { weatherAtom } from "../lib/atoms";

/** returns the spoken reply text */
export function respond(transcript: string): string {
  const text = transcript.toLowerCase();
  const reply = /\bweather\b/.test(text)
    ? weatherSentence()
    : "I'm sorry dave, I'm afraid I can't do that.";
  return reply;
}

function weatherSentence(): string {
  const w = getDefaultStore().get(weatherAtom);
  if (!w) throw new Error("weather not loaded");
  let text = `It's ${Math.round(w.temperature)} degrees, ${w.weatherText.toLowerCase()}`;
  text += `, with a high of ${Math.round(w.daily.tempMax)} and a low of ${Math.round(w.daily.tempMin)}`;
  if (w.daily.rainProbMax >= 30)
    text += `. There's a ${w.daily.rainProbMax} percent chance of rain`;
  return text;
}
