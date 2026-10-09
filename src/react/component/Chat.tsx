import { useEffect, useRef, useState } from "react";
import { startWakeword, stopWakeword } from "../wakeword/wakeword";
import { dictateOnce } from "../audio/dication";
import { useTts } from "../lib/useTts";
import { respond } from "../lib/chat";
import { useLocalStorage } from "../useLocalStorage";

export function ChatWidget({ onOpen }: { onOpen: () => void }) {
  const [running] = useLocalStorage("chatRunning", false);
  if (!running) return null;
  return (
    <button
      className="button button-glass flex items-center gap-1"
      onClick={onOpen}
      title="Chat"
    >
      💬
    </button>
  );
}

export default function ChatPage() {
  const [running, setRunning] = useLocalStorage("chatRunning", false);
  const [transcript, setTranscript] = useState("");
  const say = useTts();
  const [listening, setListening] = useState(false);
  const listeningRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    console.log("[chat] starting…");
    startWakeword(["hey_jarvis"], {
      onDetect: async () => {
        if (listeningRef.current) return; // ignore re-triggers during dictation
        listeningRef.current = true;
        setListening(true);
        try {
          const { transcript: text } = await dictateOnce();
          console.log("[chat] heard:", text);
          setTranscript(text);
          if (text) {
            const reply = respond(text);
            console.log("[chat] reply:", reply);
            say(reply);
          } else {
            console.warn("[chat] dictation returned nothing");
          }
        } catch (err) {
          console.error("[chat] dictation failed:", err);
        } finally {
          listeningRef.current = false;
          setListening(false);
        }
      },
      onError: (err) => console.error("[chat] wakeword error:", err),
    }).catch((err) => {
      console.error("[chat] wakeword failed to start:", err);
      setRunning(false);
    });
    return () => {
      stopWakeword();
    };
  }, [running]);

  return (
    <div className="grid place-items-center p-8">
      <button className="button" onClick={() => setRunning(!running)}>
        {running ? "⏹ Stop" : "▶ Start"}
      </button>
      {running && (
        <p className="mt-4 text-center">
          {listening
            ? '🎙 listening… say "hey jarvis" then speak'
            : 'Say "hey jarvis"'}
        </p>
      )}
      {transcript && <p className="mt-2 text-center italic">“{transcript}”</p>}
    </div>
  );
}
