import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { ttsVoiceAtom } from "./atoms";
import { speak } from "../component/Chime";

/** wraps the selected tts voice; read(text) speaks it with that voice */
export function useTts() {
  const voiceURI = useAtomValue(ttsVoiceAtom);
  return useCallback((text: string) => speak(text, voiceURI), [voiceURI]);
}
