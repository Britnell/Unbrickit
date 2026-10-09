import { FilesetResolver } from "@mediapipe/tasks-vision";

// single shared wasm runtime: both landmarkers reuse one wasm heap instead of
// FilesetResolver.forVisionTasks loading a second copy
let visionPromise: Promise<
  Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>
> | null = null;
export function getVisionRuntime() {
  visionPromise ??= FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm",
  );
  return visionPromise;
}
