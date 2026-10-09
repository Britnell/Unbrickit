import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { colors, fonts } from "./state";
import type { CurrentWeather } from "../weather";

export interface StoredLocation {
  name: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface Theme {
  font: string;
  fontSize: number;
  fontWeight: number;
  hue: number;
  colorMode: string;
  darkMode: boolean;
}

export const themeAtom = atomWithStorage<Theme>("theme", {
  font: fonts[0],
  fontSize: 30,
  fontWeight: 400,
  hue: 0,
  colorMode: "pastel",
  darkMode: false,
});

// debug override for daylight mode: null = follow real clock
export const timeOfDayAtom = atom<number | null>(null);

/** current time in ms, ticked every second by App (single app-wide clock) */
export const clockTimeAtom = atom(Date.now());

/** current decimal hour, derived from clockTimeAtom */
export function hourOf(t: number) {
  const d = new Date(t);
  return d.getHours() + d.getMinutes() / 60;
}

export const paletteAtom = atom((get) =>
  colors(
    get(themeAtom).hue,
    get(themeAtom).colorMode,
    get(themeAtom).darkMode,
    get(timeOfDayAtom) ?? hourOf(get(clockTimeAtom)),
  ),
);

/** chime sound type, global setting used by the chime timer (not the tracker) */
export const chimeTypeAtom = atomWithStorage<string>("chimeType", "chime");

/** global notification sound, shared by pomodoro, seating reminder, posture */
export const notificationSoundAtom = atomWithStorage<string>("notificationSound", "chime");

export const ttsVoiceAtom = atomWithStorage<string>("ttsVoice", "");

/** global chat status: idle | listening (mic) | speaking (tts) */
export type ChatState = "idle" | "listening" | "speaking";
export const chatStateAtom = atom<ChatState>("idle");
/** latest utterance heard by the chat engine */
export const chatTranscriptAtom = atom("");
/** chat engine on/off, synced across App engine, chat page and widget */
export const chatRunningAtom = atomWithStorage("chatRunning", false);

/** currently playing podcast episode, null = not playing (list shown) */
export interface PlayingEpisode {
  title: string | null;
  audioUrl: string | null;
  img: string | null;
  duration: string | null;
  podcastName?: string;
}

export const playingPodcastAtom = atom<PlayingEpisode | null>(null);
/** true while the global podcast audio is paused */
export const playingPodcastPausedAtom = atom(false);


/** stored weather location, shared by weather page + widget */
export const weatherLocationAtom = atomWithStorage<StoredLocation | null>(
  "weatherLocation",
  null,
);

/** latest weather data, fetched globally */
export const weatherAtom = atom<CurrentWeather | null>(null);

/** show the weather widget in the corner */
export const weatherWidgetAtom = atomWithStorage<boolean>("weatherWidget", false);
