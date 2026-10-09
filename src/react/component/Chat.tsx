import { useEffect, useState } from "react";
import { startWakeword, stopWakeword } from "../wakeword/wakeword";
import { dictateOnce } from "../audio/dication";
import { useTts } from "../lib/useTts";
import { respond } from "../lib/chat";

export default function ChatPage() {
  const [running, setRunning] = useState(false);
  const [transcript, setTranscript] = useState("");
  const say = useTts();
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!running) return;
    console.log("[chat] starting…");
    startWakeword(["hey_jarvis"], {
      onDetect: async ({ keyword, score }) => {
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
