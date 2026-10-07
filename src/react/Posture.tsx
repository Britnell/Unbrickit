import { useEffect } from "react";
import { toast } from "sonner";
import { atom, useAtomValue, useSetAtom } from "jotai";
import type {
  FaceLandmarker,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { createFaceLandmarker, headPose } from "./face";
import { SlouchDetector } from "./postureDetect";
import { YDriftMeter, type DriftValue } from "./drift";
import { acquireCamera, releaseCamera } from "./camera";
import { useNotificationSound } from "./Chime";

/* ------------------------------- thresholds ------------------------------- */

// angle integrals: trigger above thresh, clear below the lower value (hysteresis)
const PITCH_SLOUCH_THRESH = 45; // face-landmark pitch integral
const PITCH_SLOUCH_CLEAR = 15;
// drift-based slouch: integrated downward drift must exceed this (same units
// for both sources for now — y-diffs in normalized coords are comparable)
const DRIFT_SLOUCH_THRESH = 2.6;
const DRIFT_CLEAR = 0.7;
// don't notify (sound/toast) more often than this, even on real slouches
const MIN_NOTIFY_INTERVAL_S = 60;
// consecutive sampled frames with no face before we report "not detected"
const NO_FACE_DEBOUNCE = 10;
const RUNNING_KEY = "posture-running";

/* -------------------------------- landmarks ------------------------------- */

// face-landmark drift points: forehead / cheeks / jaw, far apart per region
const FACE_DRIFT_IDS = [
  107,
  336,
  105,
  334, // forehead inner + outer
  50,
  280,
  116,
  345, // cheekbone + lower cheeks
  172,
  397,
  149,
  378, // jaw + jawline
];

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
  /** summed point-set movement vector since N seconds ago */
  drift: DriftValue | null;
}
export const postureUiAtom = atom<PostureUi>({
  isRunning: false,
  level: "ok",
  hasFace: false,
  pose: null,
  integral: 0,
  drift: null,
});

/** engine subscribes to this only — postureUiAtom updates at ~6Hz from the
 *  detection loop, and re-rendering on each write would churn the effect below */
const isRunningAtom = atom((get) => get(postureUiAtom).isRunning);

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

/* ------------------------------ detector state ----------------------------- */

const angleDetector = () => {
  const angle = new SlouchDetector();
  angle.slouchThresh = PITCH_SLOUCH_THRESH;
  return angle;
};

/* ------------------------------ measurements ------------------------------ */

/** face landmarks -> (pitch integral, drift) */
function measureFace(
  angle: SlouchDetector,
  drift: YDriftMeter,
  face: ReturnType<FaceLandmarker["detectForVideo"]>,
  lm: NormalizedLandmark[],
  now: number,
) {
  const p = headPose(face); // {roll, pitch, yaw} from transformation matrix
  const integral = p ? angle.sample(-p.pitch, now).integral : 0; // -pitch grows when slouching
  return { pose: p, integral, drift: drift.value(lm, FACE_DRIFT_IDS, now) };
}

/** slouch verdict with hysteresis */
function evaluate(
  integral: number,
  drift: DriftValue | null,
  isSlouching: boolean,
) {
  const driftHit = !!drift && drift.integ > DRIFT_SLOUCH_THRESH;
  if (!isSlouching && (integral > PITCH_SLOUCH_THRESH || driftHit)) return true;
  if (
    isSlouching &&
    integral < PITCH_SLOUCH_CLEAR &&
    (!drift || drift.integ < DRIFT_CLEAR)
  )
    return false;
  return isSlouching;
}

/* --------------------------------- engine --------------------------------- */

/** Mount once (App). Owns the camera loop, publishes level into postureUiAtom. */
export function usePostureEngine() {
  const isRunning = useAtomValue(isRunningAtom);
  const setUi = useSetAtom(postureUiAtom);
  const playNotif = useNotificationSound();

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
        source: null,
      }));
      return;
    }
    let cancelled = false;
    let faceLandmarker: FaceLandmarker | null = null;
    let ownsCamera = false;
    let raf = 0;
    let video: HTMLVideoElement;
    let lastVideoTime = -1;
    let frame = 0;
    let isSlouching = false;
    let lastNotifAt = 0;
    const angle = angleDetector();
    const driftMeter = new YDriftMeter();
    // debounce: face must be missing this many sampled frames in a row before
    // we treat it as "user not detected" (single dropped frames are ignored)
    let noFaceFrames = 0;

    (async () => {
      try {
        faceLandmarker = await createFaceLandmarker();
        if (cancelled) return;
        video = await acquireCamera();
        ownsCamera = true;
        if (cancelled) {
          releaseCamera();
          return;
        }
      } catch (err) {
        console.error("camera/model failed:", err);
        setUi((ui) => ({ ...ui, isRunning: false }));
        return;
      }
      const loop = () => {
        if (cancelled) return;
        // sample every 10th frame (~6Hz): plenty for drift detection
        if (
          frame++ % 10 === 0 &&
          video.currentTime !== lastVideoTime &&
          faceLandmarker
        ) {
          lastVideoTime = video.currentTime;
          const now = performance.now();

          const faceRes = faceLandmarker.detectForVideo(video, now);
          const faceLm = faceRes.faceLandmarks?.[0];
          noFaceFrames = faceLm ? 0 : noFaceFrames + 1;
          const detected = noFaceFrames < NO_FACE_DEBOUNCE;

          let poseEuler: PostureUi["pose"];
          let integral: number;
          let drift: DriftValue | null;

          if (faceLm) {
            const m = measureFace(angle, driftMeter, faceRes, faceLm, now);
            poseEuler = m.pose;
            integral = m.integral;
            drift = m.drift;
          } else {
            angle.reset();
            driftMeter.reset();
            poseEuler = null;
            integral = 0;
            drift = null;
          }

          isSlouching = evaluate(integral, drift, isSlouching);

          if (
            isSlouching &&
            now - lastNotifAt >= MIN_NOTIFY_INTERVAL_S * 1000
          ) {
            lastNotifAt = now;
            playNotif();
            toast("Bad posture detected — sit up straight! 🧍");
          }

          if (!detected) isSlouching = false;

          const level: PostureLevel = detected && isSlouching ? "slouch" : "ok";
          setUi((ui) =>
            ui.level === level &&
            ui.hasFace === detected &&
            ui.pose === poseEuler &&
            ui.integral === integral &&
            ui.drift === drift
              ? ui
              : {
                  ...ui,
                  level,
                  hasFace: detected,
                  pose: poseEuler,
                  integral,
                  drift,
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
      faceLandmarker?.close();
    };
  }, [isRunning, setUi, playNotif]);
}

/* --------------------------------- views ---------------------------------- */

/** corner widget shown on clock page while posture monitoring is active */
export function PostureWidget({ onOpen }: { onOpen: () => void }) {
  const { isRunning, level, hasFace } = useAtomValue(postureUiAtom);
  if (!isRunning) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className={`button text-lg z-10 ${level === "slouch" ? "!bg-red-600 !opacity-100" : ""}`}
    >
      {!hasFace ? "🕳️" : level === "slouch" ? "🥀 !" : "🌹"}
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
          <span className="text-6xl">
            {!hasFace ? "🕳️" : level === "slouch" ? "🥀" : "🌹"}
          </span>
          <span className="text-2xl font-bold tracking-wider">
            {!hasFace
              ? "NOT DETECTED"
              : level === "slouch"
                ? "SLOUCHING"
                : "OK"}
          </span>
        </div>
      )}
      <button
        className="mx-auto button"
        onClick={() => (isRunning ? stop() : start())}
      >
        {isRunning ? "Stop" : "Start Camera"}
      </button>{" "}
    </div>
  );
}
