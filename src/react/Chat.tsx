import { useEffect, useRef, useState } from "react";
import { HotwordDetector } from "./hotword";

export default function ChatApp({ onClose }: { onClose: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [listening, setListening] = useState(false);
    const [micActive, setMicActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<any>(null);
  const hwRef = useRef<HotwordDetector | null>(null);
  const [hotwordOn, setHotwordOn] = useState(false);
  const [confidence, setConfidence] = useState(0);

  const toggleHotword = async () => {
    if (hotwordOn) {
      hwRef.current?.stop();
      setHotwordOn(false);
      setConfidence(0);
      console.log("hotword stopped");
      return;
    }
    try {
      if (!hwRef.current) {
        hwRef.current = new HotwordDetector({
          hotword: "alexa",
          threshold: 0.7,
          onConfidence: setConfidence,
          onDetected: (word, c) =>
            console.log(`hotword detected: ${word} (${c.toFixed(3)})`),
        });
      }
      await hwRef.current.start();
      setHotwordOn(true);
      console.log("hotword listening for 'alexa'");
    } catch (err) {
      console.error("hotword error:", err);
      alert("Hotword detection failed: " + err);
    }
  };

  const toggleMicStream = async () => {
    if (micActive) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setMicActive(false);
      console.log("mic stopped");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicActive(true);
      console.log(
        "mic started:",
        stream.getAudioTracks().map((t) => t.label)
      );
    } catch (err) {
      console.error("mic error:", err);
      alert("Could not access microphone: " + err);
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
    return () => {
      recRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      hwRef.current?.stop();
    };
  }, []);

  return (
    <div className="absolute inset-0" onClick={onClose}>
      <div
        className="absolute w-[300px] left-1/2 -translate-x-1/2 bottom-2 p-4 bg-white/50 text-black rounded z-10 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={toggleMicStream} className="button self-start">
          {micActive ? "Stop" : "Start"}
        </button>
        <button onClick={onClose} className="button self-end text-2xl">
          ×
        </button>
        <button onClick={toggleHotword} className="button self-start">
          {hotwordOn ? "Hotword " + (confidence * 100).toFixed(0) + "%" : "Wake word"}
        </button>
        <div className="flex w-full gap-2">
          <input
            className="w-full"
            placeholder="Type a message…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
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
      </div>
    </div>
  );
}
