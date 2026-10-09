import type { CurrentWeather } from "../weather";

/** voice command parsing: transcript -> { tool, action }.
 *  pure logic only — the actions are executed in useChatEngine. */

export type Tool =
  | "podcast"
  | "radio"
  | "pomodoro"
  | "weather"
  | "time"
  | "date";
export type Action = "start" | "stop";

export interface ParsedCommand {
  tool: Tool;
  action: Action;
}

/** "play podcast" and "start podcast" both give { tool, action: "start" };
 *  "pause"/"stop" both give action "stop". a bare "stop" (no tool word)
 *  is handled by stopAudio(). */
export function parseCommand(transcript: string): ParsedCommand | "stopAudio" | null {
  const text = transcript.toLowerCase();

  const tool: Tool | null = /\bpodcast\b/.test(text)
    ? "podcast"
    : /\bradio\b/.test(text)
      ? "radio"
      : /\bpomodoro\b|\btimer\b/.test(text)
        ? "pomodoro"
        : /\bweather\b/.test(text)
          ? "weather"
          : /\bwhat\b/.test(text) && /\btime\b/.test(text)
            ? "time"
            : /\bwhat\b/.test(text) && (/\bdate\b|\bday\b/.test(text))
              ? "date"
              : null;

  const action: Action = /\bplay\b|\bstart\b/.test(text) ? "start" : "stop";

  if (tool) return { tool, action };
  // bare "stop" with no tool keyword: stop whatever audio is running
  if (/\bstop\b|\bpause\b/.test(text)) return "stopAudio";
  return null;
}

/** pure reply builder for weather data (null checks live in the engine) */
export function weatherReply(w: CurrentWeather): string {
  let text = `It's ${Math.round(w.temperature)} degrees, ${w.weatherText.toLowerCase()}`;
  text += `, with a high of ${Math.round(w.daily.tempMax)} and a low of ${Math.round(w.daily.tempMin)}`;
  if (w.daily.rainProbMax >= 30)
    text += `. There's a ${w.daily.rainProbMax} percent chance of rain`;
  return text;
}
