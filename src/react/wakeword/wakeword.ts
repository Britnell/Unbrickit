// Wake word detection using vendored OpenWakeWord WASM engine.
// Models are served from public/openwakeword/models.
import { WakeWordEngine } from "./WakeWordEngine";

export type WakeWordKeyword =
  "hey_jarvis" | "alexa" | "hey_mycroft" | "hey_rhasspy" | "timer" | "weather";

export interface DetectEvent {
  keyword: string;
  score: number;
  at: number;
}

export interface WakewordHandlers {
  onDetect?: (e: DetectEvent) => void;
  onReady?: () => void;
  onSpeech?: (active: boolean) => void;
  onError?: (err: unknown) => void;
}

let engine: WakeWordEngine | null = null;
const unsubs: Array<() => void> = [];

/** Load models and start listening. Resolves once detection is running. */
export async function startWakeword(
  keywords: WakeWordKeyword[] = ["hey_jarvis"],
  handlers: WakewordHandlers = {},
  threshold = 0.5,
): Promise<void> {
  await stopWakeword();

  const base = import.meta.env.BASE_URL;
  const eng = new WakeWordEngine({
    baseAssetUrl: `${base}openwakeword/models`,
    ortWasmPath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/",
    keywords,
    detectionThreshold: threshold,
  });
  engine = eng;

  unsubs.push(
    eng.on("detect", (e: DetectEvent) => handlers.onDetect?.(e)),
    eng.on("ready", () => handlers.onReady?.()),
    eng.on("speech-start", () => handlers.onSpeech?.(true)),
    eng.on("speech-end", () => handlers.onSpeech?.(false)),
    eng.on("error", (err: unknown) => handlers.onError?.(err)),
  );

  await eng.load();
  await eng.start(); // prompts for mic
}

/** Change which loaded keywords can emit detections. */
export function setActiveKeywords(keywords: WakeWordKeyword[]) {
  engine?.setActiveKeywords(keywords);
}

export function isWakewordRunning() {
  return !!engine;
}

/** Stop listening and release mic/models. */
export async function stopWakeword() {
  for (const u of unsubs.splice(0)) u();
  if (engine) {
    try {
      engine.stop();
    } catch {
      /* already stopped */
    }
    engine = null;
  }
}
