import { useEffect } from "react";
import { toast } from "sonner";
import { atom, useAtomValue, useSetAtom } from "jotai";
import type {
  FaceLandmarker,
  PoseLandmarker,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { createFaceLandmarker, headPose } from "./face";
import { createLandmarker } from "./poseLandmarker";
import { poseAngles } from "./headFromPose";
import { SlouchDetector } from "./postureDetect";
import { YDriftMeter, type DriftValue } from "./drift";
import { acquireCamera, releaseCamera } from "./camera";
import { useNotificationSound } from "./Chime";

/* ------------------------------- thresholds ------------------------------- */

// angle integrals: trigger above thresh, clear below the lower value (hysteresis)
const PITCH_SLOUCH_THRESH = 45; // face-landmark pitch integral
const PITCH_SLOUCH_CLEAR = 15;
const NECK_SLOUCH_THRESH = 30; // pose-landmark neck tilt integral (tune me)
const NECK_SLOUCH_CLEAR = 10;
// drift-based slouch: integrated downward drift must exceed this (same units
// for both sources for now — y-diffs in normalized coords are comparable)
const DRIFT_SLOUCH_THRESH = 2.6;
const DRIFT_CLEAR = 0.7;
// don't notify (sound/toast) more often than this, even on real slouches
const MIN_NOTIFY_INTERVAL_S = 60;
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
// pose-landmark drift points: the ~10 face points pose gives us
// (eyes, nose, ears, mouth)
const POSE_DRIFT_IDS = [0, 1, 2, 3, 5, 6, 7, 8, 9, 10];

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
  /** which landmark source produced the current numbers */
  source: "face" | "pose" | null;
}
export const postureUiAtom = atom<PostureUi>({
  isRunning: false,
  level: "ok",
  hasFace: false,
  pose: null,
  integral: 0,
  drift: null,
  source: null,
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
    source: null,
  }));
  sessionStorage.removeItem(RUNNING_KEY);
});

/* ----------------------------- per-source state ---------------------------- */

/** one of these per landmark source; separate instances = never-mixed
 *  filter histories and integrals */
interface SourceState {
  /** pitch (face) or neck tilt (pose) integral detector */
  angle: SlouchDetector;
  /** y-drift of the source's face points */
  drift: YDriftMeter;
  /** this source's trigger/clear thresholds */
  angleThresh: number;
  angleClear: number;
}

function faceSource() {
  const angle = new SlouchDetector();
  angle.slouchThresh = PITCH_SLOUCH_THRESH;
  return {
    angle,
    drift: new YDriftMeter(),
    angleThresh: PITCH_SLOUCH_THRESH,
    angleClear: PITCH_SLOUCH_CLEAR,
  } satisfies SourceState;
}

function poseSource() {
  const angle = new SlouchDetector();
  angle.slouchThresh = NECK_SLOUCH_THRESH;
  return {
    angle,
    drift: new YDriftMeter(),
    angleThresh: NECK_SLOUCH_THRESH,
    angleClear: NECK_SLOUCH_CLEAR,
  } satisfies SourceState;
}

/* ------------------------------ measurements ------------------------------ */

/** face landmarks -> (pitch integral, drift); null angle if pose unavailable */
function measureFace(
  src: SourceState,
  face: ReturnType<FaceLandmarker["detectForVideo"]>,
  lm: NormalizedLandmark[],
  now: number,
) {
  const p = headPose(face); // {roll, pitch, yaw} from transformation matrix
  const integral = p ? src.angle.sample(-p.pitch, now).integral : 0; // -pitch grows when slouching
  return { pose: p, integral, drift: src.drift.value(lm, FACE_DRIFT_IDS, now) };
}

/** pose landmarks -> (neck-tilt integral, face-point drift) */
function measurePose(
  src: SourceState,
  poseLm: NormalizedLandmark[],
  now: number,
) {
  const a = poseAngles(poseLm); // neck: + = leaning forward
  return {
    integral: src.angle.sample(a.neck, now).integral,
    drift: src.drift.value(poseLm, POSE_DRIFT_IDS, now),
  };
}

/** slouch verdict with hysteresis; same drift thresholds for both sources */
function evaluate(
  src: SourceState,
  integral: number,
  drift: DriftValue | null,
  isSlouching: boolean,
) {
  const driftHit = !!drift && drift.integ > DRIFT_SLOUCH_THRESH;
  if (!isSlouching && (integral > src.angleThresh || driftHit)) return true;
  if (
    isSlouching &&
    integral < src.angleClear &&
    (!drift || drift.integ < DRIFT_CLEAR)
  )
    return false;
  return isSlouching;
}

/* --------------------------------- engine --------------------------------- */

/** Mount once (App). Owns the camera loop, publishes level into postureUiAtom.
 *  Tries face landmarks first (cheaper, more precise); only falls back to the
 *  pose model when no face is detected. */
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
    let poseLandmarker: PoseLandmarker | null = null;
    let ownsCamera = false;
    let raf = 0;
    let video: HTMLVideoElement;
    let lastVideoTime = -1;
    let frame = 0;
    let isSlouching = false;
    let lastNotifAt = 0;
    const face = faceSource();
    const pose = poseSource();

    (async () => {
      try {
        faceLandmarker = await createFaceLandmarker();
        poseLandmarker = await createLandmarker("lite");
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

          // 1) face landmarks first — if we have them, never run the pose model
          const faceRes = faceLandmarker.detectForVideo(video, now);
          const faceLm = faceRes.faceLandmarks?.[0];

          let poseEuler: PostureUi["pose"];
          let integral: number;
          let drift: DriftValue | null;
          let source: PostureUi["source"];

          if (faceLm) {
            const m = measureFace(face, faceRes, faceLm, now);
            poseEuler = m.pose;
            integral = m.integral;
            drift = m.drift;
            source = "face";
          } else {
            // 2) no face -> fall back to pose landmarks
            face.angle.reset(); // never mix face/pose histories
            face.drift.reset();
            const poseLm = poseLandmarker?.detectForVideo(video, now)
              .landmarks?.[0];
            if (poseLm) {
              const m = measurePose(pose, poseLm, now);
              poseEuler = null; // no head-pose euler without a face
              integral = m.integral;
              drift = m.drift;
              source = "pose";
            } else {
              pose.angle.reset();
              pose.drift.reset();
              poseEuler = null;
              integral = 0;
              drift = null;
              source = null;
            }
          }

          isSlouching = evaluate(
            source === "pose" ? pose : face,
            integral,
            drift,
            isSlouching,
          );

          const label =
            source === "face"
              ? "face (pitch)"
              : source === "pose"
                ? "pose (neck)"
                : "none";
          console.log(
            `${label} | angle integ: ${integral.toFixed(2)} | drift: ${drift ? drift.integ.toFixed(2) : "(none)"} | slouch: ${isSlouching}`,
          );

          if (
            isSlouching &&
            now - lastNotifAt >= MIN_NOTIFY_INTERVAL_S * 1000
          ) {
            lastNotifAt = now;
            playNotif();
            toast("Bad posture detected — sit up straight! 🧍");
          }

          const level: PostureLevel = isSlouching ? "slouch" : "ok";
          setUi((ui) =>
            ui.level === level &&
            ui.hasFace === (source !== null) &&
            ui.pose === poseEuler &&
            ui.integral === integral &&
            ui.drift === drift &&
            ui.source === source
              ? ui
              : {
                  ...ui,
                  level,
                  hasFace: source !== null,
                  pose: poseEuler,
                  integral,
                  drift,
                  source,
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
      poseLandmarker?.close();
    };
  }, [isRunning, setUi, playNotif]);
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
      className={`button text-lg z-10 ${level === "slouch" ? "!bg-red-600 !opacity-100" : ""}`}",
    >
      {level === "slouch" ? "🥀 !" : "🌹"}
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
      </button>{" "}
    </div>
  );
}
