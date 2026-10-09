import { useEffect, useState } from "react";
import { startWakeword, stopWakeword } from "./wakeword";
import { dictateOnce } from "./speech";

export default function ChatPage() {
  const [running, setRunning] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!running) return;
    startWakeword(["hey_jarvis"], {
      onDetect: async ({ keyword, score }) => {
        console.log(`[wakeword] ${keyword} (${score.toFixed(2)})`);
        setListening(true);
        try {
          const { transcript: text } = await dictateOnce();
          setTranscript(text);
          console.log("[dictation]", text);
        } catch (err) {
          console.error("[dictation]", err);
        } finally {
          setListening(false);
        }
      },
      onError: (err) => console.error("[wakeword]", err),
    }).catch((err) => {
      console.error("[wakeword] failed to start:", err);
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
          {listening ? "🎙 listening… say \"hey jarvis\" then speak" : "Say \"hey jarvis\""}
        </p>
      )}
      {transcript && <p className="mt-2 text-center italic">“{transcript}”</p>}
    </div>
  );
}
