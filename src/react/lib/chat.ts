import { getDefaultStore } from "jotai";
import {
  playingPodcastAtom,
  playingPodcastPausedAtom,
  weatherAtom,
  weatherLocationAtom,
} from "../lib/atoms";
import { playingRadioAtom, startRadio, stopRadio } from "./useRadio";
import {
  startPodcast,
  stopPodcast,
  pausePodcast,
} from "./usePodcast";
import { pomodoroStateAtom } from "../lib/atoms";
import { startPomodoro, stopPomodoro } from "../component/Pomodoro";

/** returns the spoken reply text */
export function respond(transcript: string): string {
  const text = transcript.toLowerCase();
  const reply = /\bpodcast\b/.test(text)
    ? podcastSentence(text)
    : /\bradio\b/.test(text)
      ? radioSentence(text)
    : /\bweather\b/.test(text)
      ? weatherSentence()
    : /\bpomodoro\b|\btimer\b/.test(text)
      ? pomodoroSentence(text)
      : "I'm sorry dave, I'm afraid I can't do that.";
  return reply;
}

function podcastSentence(text: string): string {
  const playing = getDefaultStore().get(playingPodcastAtom);
  const paused = getDefaultStore().get(playingPodcastPausedAtom);
  const wantsStop = /\b(stop|pause)\b/.test(text);

  if (wantsStop) {
    // "pause" keeps the episode + position, "stop" clears it
    if (/\bpause\b/.test(text) && playing) {
      pausePodcast();
      return "Podcast paused";
    }
    stopPodcast();
    return playing ? "Podcast stopped" : "No podcast is playing";
  }
  if (!playing || paused) {
    if (!startPodcast()) return "There are no podcasts";
  }
  return playing && !paused ? "The podcast is already playing" : "Podcast on";
}

function radioSentence(text: string): string {
  const playing = getDefaultStore().get(playingRadioAtom);
  const wantsStop = /\b(stop|pause)\b/.test(text);

  if (wantsStop) {
    stopRadio();
    return playing ? "Radio stopped" : "The radio isn't playing";
  }
  if (!playing) startRadio();
  return playing ? "The radio is already playing" : "Radio on";
}

function pomodoroSentence(text: string): string {
  const running =
    getDefaultStore().get(pomodoroStateAtom).startTime !== null;
  const wantsStop = /\b(stop|pause)\b/.test(text);

  if (wantsStop) {
    if (!running) return "The timer isn't running";
    stopPomodoro();
    return "Timer stopped";
  }
  if (running) return "The timer is already running";
  startPomodoro();
  return "Timer started";
}

function weatherSentence(): string {
  const w = getDefaultStore().get(weatherAtom);
  if (!w) {
    return getDefaultStore().get(weatherLocationAtom)
      ? "Weather hasn't loaded yet"
      : "No city selected";
  }
  let text = `It's ${Math.round(w.temperature)} degrees, ${w.weatherText.toLowerCase()}`;
  text += `, with a high of ${Math.round(w.daily.tempMax)} and a low of ${Math.round(w.daily.tempMin)}`;
  if (w.daily.rainProbMax >= 30)
    text += `. There's a ${w.daily.rainProbMax} percent chance of rain`;
  return text;
}
