import { useEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import { startWakeword, stopWakeword } from "../wakeword/wakeword";
import { dictateOnce } from "../audio/dication";
import { useAtom } from "jotai";
import { chatRunningAtom, chatStateAtom, chatTranscriptAtom } from "./atoms";
import { useTts } from "./useTts";
import { respond } from "./chat";

let engineMounted = false;

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

  useEffect(() => {
    if (!running || engineMounted) return;
    engineMounted = true;
    console.log("[chat] starting…");
    startWakeword(["hey_jarvis"], {
      onDetect: async () => {
        if (listeningRef.current) return; // ignore re-triggers during dictation
        listeningRef.current = true;
        setTranscript(""); // clear last utterance
        setChatState("listening");
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
            setChatState("idle");
          }
        } catch (err) {
          console.error("[chat] dictation failed:", err);
          setChatState("idle");
        } finally {
          listeningRef.current = false;
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
