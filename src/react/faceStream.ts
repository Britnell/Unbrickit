import type {
  FaceLandmarker,
  FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { createFaceLandmarker } from "./face";
import { acquireCamera, releaseCamera } from "./camera";

/**
 * Shared face-detection stream: one camera + one FaceLandmarker, one
 * detectForVideo call per sampled frame, fanned out to all subscribers.
 * First subscriber starts the loop, last one stops it.
 */

export type FaceFrame = {
  result: FaceLandmarkerResult;
  now: number;
};
type Listener = (frame: FaceFrame) => void;

const listeners = new Set<Listener>();
let landmarker: FaceLandmarker | null = null;
let video: HTMLVideoElement | null = null;
let raf = 0;
let starting = false;
let lastVideoTime = -1;
let frameCount = 0;

/** sample every 10th frame (~6Hz at 60fps) */
const SAMPLE_EVERY = 10;

async function start() {
  if (starting) return;
  starting = true;
  try {
    landmarker = await createFaceLandmarker();
    video = await acquireCamera();
    const loop = () => {
      if (listeners.size === 0 || !landmarker || !video) return;
      if (
        frameCount++ % SAMPLE_EVERY === 0 &&
        video.currentTime !== lastVideoTime
      ) {
        lastVideoTime = video.currentTime;
        const now = performance.now();
        try {
          const result = landmarker.detectForVideo(video, now);
          for (const l of listeners) l({ result, now });
        } catch (err) {
          console.error("[faceStream] detect failed:", err);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  } catch (err) {
    console.error("[faceStream] camera/model failed:", err);
    // deliver an empty "no face" frame so subscribers degrade gracefully
    const now = performance.now();
    for (const l of listeners)
      l({
        result: {
          faceLandmarks: [],
          faceBlendshapes: [],
          facialTransformationMatrixes: [],
        },
        now,
      });
    stop();
  } finally {
    starting = false;
  }
}

function stop() {
  cancelAnimationFrame(raf);
  landmarker?.close();
  landmarker = null;
  releaseCamera();
  video = null;
  lastVideoTime = -1;
  frameCount = 0;
}

/** Subscribe to shared face frames. Returns an unsubscribe function. */
export function subscribeFace(listener: Listener): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && !landmarker) void start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}
