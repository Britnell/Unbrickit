import { useEffect, useRef, useState } from "react";

export default function ChatApp({ onClose }: { onClose: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

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
        <button onClick={onClose} className="self-end py-1 px-2 text-2xl hover:opacity-70">
          ×
        </button>
        <div className="flex w-full gap-2">
          <input
            className="w-full rounded px-3 py-2 bg-white text-black outline-none"
            placeholder="Type a message…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button
            onClick={toggleMic}
            title="Dictate"
            className={
              "rounded px-3 py-2 text-xl " +
              (listening ? "bg-red-500 text-white animate-pulse" : "bg-white hover:bg-gray-100")
            }
          >
            🎤
          </button>
        </div>
      </div>
    </div>
  );
}
