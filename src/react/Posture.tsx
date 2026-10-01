import { useEffect } from "react";
import { atom, useAtomValue, useSetAtom } from "jotai";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { createFaceLandmarker, headPose } from "./face";
import { SlouchDetector } from "./postureDetect";
import { acquireCamera, releaseCamera } from "./camera";
import { notify } from "../lib/tone";

const HYST_FACTOR = 0.5; // clears slouch only below thresh * this
const RUNNING_KEY = "posture-running";
// drift diff: current 6-point sample vs this many seconds ago
const DRIFT_LOOKBACK_S = 4;
// drift magnitude integrated over this window
const DRIFT_WINDOW_S = 4;
// drift-based slouch: integrated drift magnitude must exceed this,
// and drift angle must be within tolerance of target (head sinking down)
const DRIFT_SLOUCH_THRESH = 1.65;
const DRIFT_ANG_TARGET = 90;
const DRIFT_ANG_TOL = 10;

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
  /** summed 6-point movement vector since N frames ago */
  drift: { ang: number; mag: number; integ: number } | null;
}
export const postureUiAtom = atom<PostureUi>({
  isRunning: false,
  level: "ok",
  hasFace: false,
  pose: null,
  integral: 0,
  drift: null,
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
    drift: null,
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
        drift: null,
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
    // history of 6-point samples for drift vector: [x,y,z] * 6 points
    let history: { t: number; vals: number[] }[] = [];
    let driftVal: PostureUi["drift"] = null;
    // trapezoidal integral of drift magnitude over DRIFT_WINDOW_S
    let magHist: { t: number; m: number }[] = [];
    // low-pass (EMA) on the diff vector, smooths both mag and angle
    const ALPHA = 0.25;
    let smX = 0, smY = 0, smInit = false;

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
          const lm = face.faceLandmarks?.[0];
          const p = lm ? headPose(face) : null;
          if (lm) {
            // region sample points: forehead / cheeks / jaw, far apart per region
            const now = performance.now();
            const POINT_IDS = [107, 336, 50, 280, 172, 397]; // forehead / cheeks / jaw
            const vals = POINT_IDS.map((i) => [lm[i].x, lm[i].y, lm[i].z]).flat();
            history.push({ t: now, vals });
            // newest sample at or before cutoff (null if none), like slouch detector
            const cutoff = now - DRIFT_LOOKBACK_S * 1000;
            let past: number[] | null = null;
            for (let j = history.length - 1; j >= 0; j--) {
              if (history[j].t <= cutoff) { past = history[j].vals; break; }
            }
            while (history.length > 1 && history[0].t < cutoff - 2000) history.shift();
            if (past) {
              // per-point diff to ~5s ago, summed into one vector
              const dx = [0, 0, 0];
              for (let k = 0; k < vals.length; k++) {
                dx[k % 3] += vals[k] - past[k];
              }
              const mag = Math.hypot(dx[0], dx[1]);
              // low-pass only the angle (on unit components, avoids ±180° wrap)
              if (!smInit || mag < 1e-6) { smX = dx[0]; smY = dx[1]; smInit = true; }
              else {
                smX += ALPHA * (dx[0] / mag - smX);
                smY += ALPHA * (dx[1] / mag - smY);
              }
              driftVal = {
                ang: (Math.atan2(smY, smX) * 180) / Math.PI,
                mag,
              };
              // integrate magnitude over window
              magHist.push({ t: now, m: driftVal.mag });
              const winStart = now - DRIFT_WINDOW_S * 1000;
              while (magHist.length > 1 && magHist[0].t < winStart) magHist.shift();
              let integ = 0;
              for (let i = 1; i < magHist.length; i++) {
                const a = magHist[i - 1], b = magHist[i];
                integ += ((a.m + b.m) / 2) * ((b.t - a.t) / 1000);
              }
              driftVal = { ...driftVal, integ };
            } else {
              driftVal = null;
            }
          } else {
            history = [];
            driftVal = null;
            magHist = [];
            smInit = false;
          }
          if (p) {
            const r = detector.sample(p, performance.now());
            // max integral across params (pitch, noseY), with hysteresis
            const peak = Math.max(...r.integral);
            integralVal = peak;
            // drift slouch: enough downward drift, in the downward direction
            const driftHit = !!driftVal &&
              driftVal.integ > DRIFT_SLOUCH_THRESH &&
              Math.abs(driftVal.ang - DRIFT_ANG_TARGET) < DRIFT_ANG_TOL;
            if (!isSlouching && (peak > detector.slouchThresh || driftHit)) {
              isSlouching = true;
              notify();
            } else if (
              isSlouching &&
              peak < detector.slouchThresh * HYST_FACTOR &&
              (!driftVal || driftVal.integ < DRIFT_SLOUCH_THRESH * HYST_FACTOR)
            ) {
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
            ui.integral === integralVal &&
            ui.drift === driftVal
              ? ui
              : {
                  ...ui,
                  level,
                  hasFace: !!p,
                  pose: p,
                  integral: integralVal,
                  drift: driftVal,
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
  const { isRunning, level, hasFace, drift } = useAtomValue(postureUiAtom);
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

        {isRunning && drift && (
          <div className="text-sm font-mono opacity-80">
            drift int {drift.integ.toFixed(2)} @ {drift.ang.toFixed(0)}°
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
