import { useEffect, useRef, useState } from "react";
import { getChatReply } from "./chat.functions";

export function ChatWidget({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className="button text-lg z-10"
    >
      💬
    </button>
  );
}

export default function ChatApp({ onClose }: { onClose: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const [reply, setReply] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!prompt.trim() || sending) return;
    setSending(true);
    try {
      const res = await getChatReply({ data: { prompt } });
      console.log(res);
    } catch (err) {
      console.error(err);
      setReply("Something went wrong.");
    } finally {
      setSending(false);
    }
  };

  const toggleMic = () => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    if ("processLocally" in rec) rec.processLocally = true;
    let finalText = prompt;
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setPrompt(finalText + interim);
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    rec.onerror = (e: any) => {
      console.error("speech error:", e.error, e.message);
      setListening(false);
      recRef.current = null;
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  useEffect(() => {
    return () => recRef.current?.stop();
  }, []);

  return (
    <div className="absolute inset-0" onClick={onClose}>
      <div
        className="absolute w-[300px] left-1/2 -translate-x-1/2 bottom-2 p-4 bg-white/50 text-black rounded z-10 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="button self-end text-2xl">
          ×
        </button>
        <div className="flex w-full gap-2">
          <input
            className="w-full"
            placeholder="Type a message…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
          <button onClick={submit} disabled={sending} className="button">
            ➤
          </button>
          <button
            onClick={toggleMic}
            title="Dictate"
            className={
              "button text-xl " +
              (listening ? "bg-red-500 text-white animate-pulse" : "")
            }
          >
            🎤
          </button>
        </div>
        {reply && <div className="mt-2 text-sm">{reply}</div>}
      </div>
    </div>
  );
}
