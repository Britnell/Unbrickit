import { FilesetResolver } from "@mediapipe/tasks-vision";

// single shared wasm runtime: both landmarkers reuse one wasm heap instead of
// FilesetResolver.forVisionTasks loading a second copy
let visionPromise: Promise<
  Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>
> | null = null;
export function getVisionRuntime() {
  visionPromise ??= FilesetResolver.forVisionTasks(
    "/mediapipe-wasm",
  );
  return visionPromise;
}
