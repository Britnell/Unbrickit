import { useEffect } from "react";
import { atom, useAtomValue, useSetAtom } from "jotai";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { createFaceLandmarker, headPose } from "./face";
import { SlouchDetector } from "./postureDetect";
import { acquireCamera, releaseCamera } from "./camera";

const HYST_FACTOR = 0.5; // clears slouch only below thresh * this
const RUNNING_KEY = "posture-running";

export type PostureLevel = "ok" | "slouch";

/* --------------------------------- atoms ---------------------------------- */

/** display snapshot the page/widget read; engine is the only writer */
export interface PostureUi {
  isRunning: boolean;
  level: PostureLevel;
  hasFace: boolean;
  /** debug readouts for the posture page */
  pose: { roll: number; pitch: number; yaw: number } | null;
  integral: number;
}
export const postureUiAtom = atom<PostureUi>({
  isRunning: false,
  level: "ok",
  hasFace: false,
  pose: null,
  integral: 0,
});

export const startPostureAtom = atom(null, (_get, set) => {
  set(postureUiAtom, (ui) => ({ ...ui, isRunning: true }));
  sessionStorage.setItem(RUNNING_KEY, "1");
});
export const stopPostureAtom = atom(null, (_get, set) => {
  set(postureUiAtom, (ui) => ({
    ...ui,
    isRunning: false,
    hasFace: false,
    pose: null,
    integral: 0,
  }));
  sessionStorage.removeItem(RUNNING_KEY);
});

/* --------------------------------- engine --------------------------------- */

/** Mount once (App). Owns the face camera loop, publishes level into postureUiAtom. */
export function usePostureEngine() {
  const isRunning = useAtomValue(postureUiAtom).isRunning;
  const setUi = useSetAtom(postureUiAtom);

  // restart after reload if the user had it running and camera permission persists
  useEffect(() => {
    if (!sessionStorage.getItem(RUNNING_KEY)) return;
    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((p) => {
        if (p.state === "granted") setUi((ui) => ({ ...ui, isRunning: true }));
      })
      .catch(() => {});
  }, [setUi]);

  useEffect(() => {
    if (!isRunning) {
      setUi((ui) => ({
        ...ui,
        level: "ok",
        hasFace: false,
        pose: null,
        integral: 0,
      }));
      return;
    }
    let cancelled = false;
    let landmarker: FaceLandmarker | null = null;
    let ownsCamera = false;
    let raf = 0;
    let video: HTMLVideoElement;
    let lastVideoTime = -1;
    let frame = 0;
    const detector = new SlouchDetector();
    let isSlouching = false;
    let integralVal = 0; // local mirror of integral (state is stale in this closure)

    (async () => {
      try {
        landmarker = await createFaceLandmarker();
        if (cancelled) return;
        video = await acquireCamera();
        ownsCamera = true;
        if (cancelled) {
          releaseCamera();
          return;
        }
      } catch (err) {
        console.error("face camera/model failed:", err);
        setUi((ui) => ({ ...ui, isRunning: false }));
        return;
      }
      const loop = () => {
        if (cancelled) return;
        // sample every 10th frame (~6Hz): plenty for drift detection
        if (frame++ % 10 === 0 && video.currentTime !== lastVideoTime && landmarker) {
          lastVideoTime = video.currentTime;
          const face = landmarker.detectForVideo(video, performance.now());
          const p = face.faceLandmarks?.[0] ? headPose(face) : null;
          if (p) {
            const r = detector.sample(p, performance.now());
            // max integral across params (pitch, noseY), with hysteresis
            const peak = Math.max(...r.integral);
            integralVal = peak;
            if (!isSlouching && peak > detector.slouchThresh) {
              isSlouching = true;
            } else if (isSlouching && peak < detector.slouchThresh * HYST_FACTOR) {
              isSlouching = false;
            }
          } else {
            detector.reset();
            integralVal = 0;
          }
          const level: PostureLevel = isSlouching ? "slouch" : "ok";
          setUi((ui) =>
            ui.level === level &&
            ui.hasFace === !!p &&
            ui.pose === p &&
            ui.integral === integralVal
              ? ui
              : {
                  ...ui,
                  level,
                  hasFace: !!p,
                  pose: p,
                  integral: integralVal,
                },
          );
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (ownsCamera) releaseCamera();
      landmarker?.close();
    };
  }, [isRunning, setUi]);
}

/* --------------------------------- views ---------------------------------- */


/** corner widget shown on clock page while posture monitoring is active */
export function PostureWidget({ onOpen }: { onOpen: () => void }) {
  const { isRunning, level } = useAtomValue(postureUiAtom);
  if (!isRunning) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className="button text-lg z-10"
    >
      {level === "slouch" ? "🥀" : "🌹"}
    </button>
  );
}

export default function PosturePage() {
  const { isRunning, level, hasFace } = useAtomValue(postureUiAtom);
  const start = useSetAtom(startPostureAtom);
  const stop = useSetAtom(stopPostureAtom);


  return (
    <div className="text-center py-8 flex flex-col gap-4">
        {isRunning && (
          <div className="flex flex-col items-center gap-2 mx-auto w-48 py-4 rounded bg-white/30">
            <span className="text-6xl">{level === "slouch" ? "🥀" : "🌹"}</span>
            <span className="text-2xl font-bold tracking-wider">
              {level === "slouch" ? "SLOUCHING" : "OK"}
              {hasFace ? "" : " (no face)"}
            </span>
          </div>
        )}

        <button
          className="mx-auto button"
          onClick={() => (isRunning ? stop() : start())}
        >
          {isRunning ? "Stop" : "Start Camera"}
        </button>    </div>
  );
}
