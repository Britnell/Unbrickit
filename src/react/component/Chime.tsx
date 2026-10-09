import { useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { playChime, randomChord } from "../audio/tone";
import { notificationSoundAtom, ttsVoiceAtom } from "../lib/atoms";
import { titleCase } from "../lib/state";

// custom sound files: drop .mp3/.ogg/.wav/.m4a files into public/sounds/
export const soundFiles: { name: string; url: string }[] = Object.entries(
  import.meta.glob("/public/sounds/*.{mp3,ogg,wav,m4a}", {
    query: "?url",
    import: "default",
    eager: true,
  }),
).map(([path, url]) => ({ name: path.split("/").pop()!, url: url as string }));

// in minutes
export const chimeIntervals = [0, 1, 5, 15, 20, 30, 60]; // 1 min only for dev testing

// file types appear as options in the type dropdown, e.g. gong1.mp3 -> 'Gong 1'
const fileTypes = soundFiles.map((f) => ({
  value: `file:${f.name}`,
  label: titleCase(
    f.name
      // strip freesound prefix '123456__author__'
      .replace(/^\d+__[^_]+__/, "")
      .replace(/\.[^.]+$/, "")
      .replace(/([a-z])(\d)/, "$1 $2")
      .replace(/[-_]/g, " "),
  ),
}));
const chimeTypes = [
  { value: "chime", label: "Chime" },
  { value: "jazzy", label: "Jazzy" },
  ...fileTypes,
];

export function playChimeType(type: string) {
  if (type === "chime") playChime();
  else if (type === "jazzy") randomChord();
  else if (type.startsWith("file:")) {
    const name = type.slice(5);
    const url = soundFiles.find((f) => f.name === name)?.url;
    if (url) void new Audio(url).play().catch(() => {});
  }
}

/** play the global notification sound (pomodoro, seating reminder, posture) */
export function useNotificationSound() {
  const type = useAtomValue(notificationSoundAtom);
  // stable identity: Posture engine effect depends on this callback
  return useCallback(() => playChimeType(type), [type]);
}

export function useChime({
  type,
  interval,
}: {
  type: string;
  interval: number;
}) {
  const lastMinute = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const m = d.getHours() * 60 + d.getMinutes();
      if (lastMinute.current === null) {
        lastMinute.current = m;
        return;
      }
      if (lastMinute.current === m) return;
      lastMinute.current = m;
      if (interval > 0 && m % interval === 0) playChimeType(type);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [type, interval]);
}

export function speak(text: string, voiceURI: string): SpeechSynthesisUtterance | null {
  if (!("speechSynthesis" in window)) {
    console.error("[tts] speechSynthesis not supported");
    return null;
  }
  const voices = speechSynthesis.getVoices();
  const voice = voices.find((v) => v.voiceURI === voiceURI);
  if (voiceURI && !voice) console.warn("[tts] voice not found:", voiceURI, "available:", voices);
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.onerror = (e) => console.error("[tts] speech error:", e.error, { voiceURI, voice });
  u.onstart = () => console.log("[tts] speaking", voice?.name ?? "default");
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  return u;
}

export default function Chime({
  type,
  setType,
  interval,
  setInterval_,
}: {
  type: string;
  setType: (v: string) => void;
  interval: number;
  setInterval_: (v: number) => void;
}) {
  const [notifSound, setNotifSound] = useAtom(notificationSoundAtom);
  const [voice, setVoice] = useAtom(ttsVoiceAtom);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => {
      const vs = speechSynthesis
        .getVoices()
        .filter((v) => v.lang.toLowerCase().startsWith("en"))
        // espeak-ng floods each language with dozens of '+Variant' voices; keep base ones
        .filter((v) => !v.name.includes("+"))
      console.log("[tts] voices loaded:", vs.length, vs.map((v) => `${v.name} (${v.lang})`));
      setVoices(vs);
    };
    load();
    speechSynthesis.onvoiceschanged = load;
    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  return (
    <div className="grid grid-cols-2 gap-y-1 gap-x-2">
      <label
        htmlFor="chime-interval"
        className="flex justify-between items-center"
      >
        Interval
      </label>
      <select
        id="chime-interval"
        value={interval}
        onChange={(e) => setInterval_(Number(e.target.value))}
        className="w-full"
      >
        {chimeIntervals.map((i) => (
          <option key={i} value={i}>
            {i === 0 ? "Off" : i === 60 ? "Hourly" : `${i} min`}
          </option>
        ))}
      </select>

      <label htmlFor="chime-type" className="flex justify-between items-center">
        Type
      </label>
      <select
        id="chime-type"
        value={type}
        onChange={(e) => {
          setType(e.target.value);
          playChimeType(e.target.value);
        }}
        className="w-full"
      >
        {chimeTypes.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <div className="col-span-2 my-2 border-t border-current opacity-20" />

      <label
        htmlFor="notif-sound"
        className="flex justify-between items-center"
      >
        Notification
      </label>
      <select
        id="notif-sound"
        value={notifSound}
        onChange={(e) => {
          setNotifSound(e.target.value);
          playChimeType(e.target.value);
        }}
        className="w-full"
      >
        {chimeTypes.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <div className="col-span-2 my-2 border-t border-current opacity-20" />

      <label htmlFor="tts-voice" className="flex justify-between items-center">
        Voice
      </label>
      <select
        id="tts-voice"
        value={voice}
        onChange={(e) => {
          setVoice(e.target.value);
          speak("Hello, this is a test.", e.target.value);
        }}
        className="w-full"
      >
        <option value="">System default</option>
        {voices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>
            {v.name} ({v.lang})
          </option>
        ))}
      </select>

      <label className="flex justify-between items-center">Test</label>
      <button
        type="button"
        onClick={() => speak("Hello, this is a voice test.", voice)}
      >
        Speak
      </button>
    </div>
  );
}
