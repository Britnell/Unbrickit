import { useEffect, useRef } from "react";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { usePomodoro } from "../component/Pomodoro";
import { startWakeword, stopWakeword } from "../wakeword/wakeword";
import { dictateOnce } from "../audio/dication";
import {
  chatRunningAtom,
  chatStateAtom,
  chatTranscriptAtom,
  playingPodcastAtom,
  playingPodcastPausedAtom,
  pomodoroStateAtom,
  weatherAtom,
  weatherLocationAtom,
} from "./atoms";
import { useTts } from "./useTts";
import { parseCommand, weatherReply } from "./chat";
import { playingRadioAtom, startRadio, stopRadio } from "./useRadio";
import { startPodcast, stopPodcast } from "./usePodcast";
import { duckMedia } from "./audioFeedback";
import { notify } from "../audio/tone";

import { timeText } from "../audio/speech";

let engineMounted = false;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
function ordinalDay(n: number): string {
  const suffix =
    n % 10 === 1 && n !== 11 ? "st"
    : n % 10 === 2 && n !== 12 ? "nd"
    : n % 10 === 3 && n !== 13 ? "rd"
    : "th";
  return `${n}${suffix}`;
}

/**
 * Global voice-chat engine: wakeword -> dictation -> reply (TTS).
 * Mount once in App so it runs on every view, not just the chat page.
 * Safe to call from any component — the engine only starts once.
 */
export function useChatEngine() {
  const [running, setRunning] = useAtom(chatRunningAtom);
  const setChatState = useSetAtom(chatStateAtom);
  const setTranscript = useSetAtom(chatTranscriptAtom);
  const say = useTts();
  const listeningRef = useRef(false);

  // current state for the voice commands
  const podcastPlaying = useAtomValue(playingPodcastAtom) !== null;
  const podcastPaused = useAtomValue(playingPodcastPausedAtom);
  const radioPlaying = useAtomValue(playingRadioAtom);
  const weather = useAtomValue(weatherAtom);
  const hasCity = useAtomValue(weatherLocationAtom) !== null;
  const pomodoroRunning = useAtomValue(pomodoroStateAtom).startTime !== null;
  const pomodoro = usePomodoro();

  /** execute a parsed { tool, action } and return the spoken reply */
  function runCommand(
    tool: "podcast" | "radio" | "pomodoro" | "weather" | "time" | "date",
    action: "start" | "stop",
  ): string {
    switch (tool) {
      case "podcast":
        if (action === "stop") {
          if (!podcastPlaying) return "";
          stopPodcast();
          return "Podcast stopped";
        }
        if (podcastPlaying && !podcastPaused)
          return "The podcast is already playing";
        return startPodcast() ? "Podcast on" : "There are no podcasts";

      case "radio":
        if (action === "stop") {
          if (!radioPlaying) return "";
          stopRadio();
          return "Radio stopped";
        }
        if (!radioPlaying) {
          startRadio();
          return "Radio on";
        }
        return "The radio is already playing";

      case "pomodoro":
        if (action === "stop") {
          if (!pomodoroRunning) return "";
          pomodoro.stop();
          return "Timer stopped";
        }
        if (pomodoroRunning) return "The timer is already running";
        pomodoro.start();
        return "Timer started";

      case "weather":
        if (!weather)
          return hasCity ? "Weather hasn't loaded yet" : "No city selected";
        return weatherReply(weather);

      case "time": {
        const now = new Date();
        return timeText(now.getHours(), now.getMinutes());
      }

      case "date": {
        const now = new Date();
        return `It is the ${ordinalDay(now.getDate())} of ${MONTHS[now.getMonth()]}`;
      }
    }
  }

  /** bare "stop": stop whatever audio is running (radio, podcast) */
  function stopAudio(): string {
    const stopped: string[] = [];
    if (radioPlaying) {
      stopRadio();
      stopped.push("radio");
    }
    if (podcastPlaying) {
      stopPodcast();
      stopped.push("podcast");
    }
    return stopped.length
      ? `Stopped the ${stopped.join(" and the ")}`
      : "";
  }

  function respond(transcript: string): string {
    const cmd = parseCommand(transcript);
    if (cmd === "stopAudio") return stopAudio();
    if (cmd) return runCommand(cmd.tool, cmd.action);
    return "I'm sorry dave, I'm afraid I can't do that.";
  }

  // dictation is async, so keep the latest respond (with fresh state)
  const respondRef = useRef(respond);
  respondRef.current = respond;

  useEffect(() => {
    if (!running || engineMounted) return;
    engineMounted = true;
    console.log("[chat] starting…");
    startWakeword(["hey_jarvis"], {
      onDetect: async () => {
        if (listeningRef.current) return; // ignore re-triggers during dictation
        listeningRef.current = true;
        notify();
        duckMedia(true);
        setTranscript(""); // clear last utterance
        setChatState("listening");
        try {
          const { transcript: text } = await dictateOnce();
          console.log("[chat] heard:", text);
          setTranscript(text);
          if (text) {
            const reply = respondRef.current(text);
            console.log("[chat] reply:", reply);
            if (reply) say(reply);
            else setChatState("idle");
          } else {
            console.warn("[chat] dictation returned nothing");
            setChatState("idle");
          }
        } catch (err) {
          console.error("[chat] dictation failed:", err);
          setChatState("idle");
        } finally {
          listeningRef.current = false;
          duckMedia(false);
        }
      },
      onError: (err) => console.error("[chat] wakeword error:", err),
    }).catch((err) => {
      console.error("[chat] wakeword failed to start:", err);
      setRunning(false);
    });
    return () => {
      engineMounted = false;
      stopWakeword();
      setChatState("idle");
    };
  }, [running]);

  return { running, setRunning };
}
