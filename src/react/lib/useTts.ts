import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { chatStateAtom, ttsVoiceAtom } from "./atoms";
import { speak } from "../component/Chime";

/** wraps the selected tts voice; read(text) speaks it with that voice */
export function useTts() {
  const voiceURI = useAtomValue(ttsVoiceAtom);
  const setChatState = useSetAtom(chatStateAtom);
  return useCallback(
    (text: string) => {
      const u = speak(text, voiceURI);
      if (!u) return;
      setChatState("speaking");
      const done = () => {
        // don't clobber a newer listening state
        setChatState((s) => (s === "speaking" ? "idle" : s));
      };
      u.onend = done;
      u.onerror = done;
    },
    [voiceURI, setChatState],
  );
}
