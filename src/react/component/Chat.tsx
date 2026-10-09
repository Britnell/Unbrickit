import { useAtomValue, useAtom } from "jotai";
import { useState } from "react";
import { chatRunningAtom, chatStateAtom, chatTranscriptAtom } from "../lib/atoms";

export function ChatWidget({ onOpen }: { onOpen: () => void }) {
  const [running] = useAtom(chatRunningAtom);
  const state = useAtomValue(chatStateAtom);
  if (!running) return null;
  return (
    <button
      className="button button-glass flex items-center gap-1"
      onClick={onOpen}
      title="Chat"
    >
      {state === "listening" ? (
        <span className="relative inline-block">
          🎙
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
        </span>
      ) : state === "speaking" ? (
        "🔊"
      ) : (
        "💬"
      )}
    </button>
  );
}

const COMMANDS = [
  "Play / stop radio",
  "Play / stop podcast",
  "Start / stop timer",
  "What's the weather",
  "What's the time",
  "What's the date / day",
  "Stop",
];

export default function ChatPage() {
  const [running, setRunning] = useAtom(chatRunningAtom);
  const state = useAtomValue(chatStateAtom);
  const transcript = useAtomValue(chatTranscriptAtom);
  const [showHelp, setShowHelp] = useState(false);

  if (!running)
    return (
      <div className="grid place-items-center p-8">
        <button className="button" onClick={() => setRunning(true)}>
          ▶ Start
        </button>
      </div>
    );

  if (showHelp)
    return (
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">Voice commands</h2>
          <button className="button" onClick={() => setShowHelp(false)}>
            ✕
          </button>
        </div>
        <p className="mt-2 text-sm opacity-70">
          Say "hey jarvis" then any of these:
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {COMMANDS.map((c) => (
            <li key={c} className="rounded-lg bg-white/5 px-3 py-2 text-sm">
              {c}
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <div className="relative grid place-items-center p-8">
      {/* help button pinned top right */}
      <button
        className="button button-glass absolute top-4 right-4"
        onClick={() => setShowHelp(true)}
        title="Voice commands"
      >
        ❓
      </button>

      {/* start/stop stays at top */}
      <div className="w-full grid place-items-center">
        <button className="button" onClick={() => setRunning(false)}>
          ⏹ Stop
        </button>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        {state === "listening" ? (
          <span className="relative text-5xl">
            🎙
            <span className="absolute top-0 right-0 h-3.5 w-3.5 rounded-full bg-red-500 animate-pulse" />
          </span>
        ) : state === "speaking" ? (
          <span className="text-5xl">🔊</span>
        ) : (
          <p className="text-center">Say "hey jarvis"</p>
        )}
      </div>

      {transcript && <p className="mt-4 text-center italic">“{transcript}”</p>}
    </div>
  );
}
