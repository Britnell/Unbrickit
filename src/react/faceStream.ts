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

const listeners = new Map<Listener, (() => void) | undefined>();
let landmarker: FaceLandmarker | null = null;
let video: HTMLVideoElement | null = null;
let raf = 0;
let starting = false;
let lastVideoTime = -1;
let frameCount = 0;

/** sample every 10th frame (~6Hz at 60fps) */
const SAMPLE_EVERY = 10;

/** consecutive detectForVideo throws before we consider the landmarker dead */
const MAX_CONSECUTIVE_DETECT_ERRORS = 30;
let detectErrors = 0;

async function start() {
  if (starting) return;
  starting = true;
  try {
    landmarker = await createFaceLandmarker();
    // everyone left while we were loading: abort
    if (listeners.size === 0) {
      landmarker.close();
      landmarker = null;
      return;
    }
    video = await acquireCamera();
    if (listeners.size === 0) {
      landmarker.close();
      landmarker = null;
      releaseCamera();
      return;
    }
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
          detectErrors = 0;
          for (const l of listeners.keys()) l({ result, now });
        } catch (err) {
          console.error("[faceStream] detect failed:", err);
          detectErrors++;
          if (detectErrors >= MAX_CONSECUTIVE_DETECT_ERRORS) {
            // landmarker is stuck (e.g. dead WebGL context): tear the stream
            // down and notify subscribers so their UI resets
            console.error(
              "[faceStream] detect failed",
              MAX_CONSECUTIVE_DETECT_ERRORS,
              "times in a row — restarting stream",
            );
            const onErrors = [...listeners.values()];
            listeners.clear();
            stop();
            detectErrors = 0;
            for (const onError of onErrors) onError?.();
            return;
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  } catch (err) {
    console.error("[faceStream] camera/model failed:", err);
    landmarker?.close();
    landmarker = null;
    video = null;
    // let each subscriber reset its own UI (e.g. isRunning = false)
    for (const onError of listeners.values()) onError?.();
    listeners.clear();
  } finally {
    starting = false;
  }
}

function stop() {
  cancelAnimationFrame(raf);
  landmarker?.close();
  landmarker = null;
  if (video) releaseCamera();
  video = null;
  lastVideoTime = -1;
  frameCount = 0;
  detectErrors = 0;
}

/**
 * Subscribe to shared face frames. Returns an unsubscribe function.
 * `onError` is called once if acquiring the camera/model failed, so the
 * subscriber can reset its UI state.
 */
export function subscribeFace(
  listener: Listener,
  onError?: () => void,
): () => void {
  listeners.set(listener, onError);
  if (listeners.size === 1 && !landmarker) void start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}
