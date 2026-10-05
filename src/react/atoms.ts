import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { colors, fonts } from "./state";

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

export const paletteAtom = atom((get) =>
  colors(
    get(themeAtom).hue,
    get(themeAtom).colorMode,
    get(themeAtom).darkMode,
    get(timeOfDayAtom),
  ),
);

/** chime sound type, global setting used by the chime timer (not the tracker) */
export const chimeTypeAtom = atomWithStorage<string>("chimeType", "chime");

/** global notification sound, shared by pomodoro, seating reminder, posture */
export const notificationSoundAtom = atomWithStorage<string>("notificationSound", "chime");

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
