import { useCallback, useEffect, useRef, useState } from "react";
import { createLandmarker } from "./poseLandmarker";
import { LandmarkOneEuro } from "./filter";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";

const POS_KEY = "tracker-position";

// --- seat comparison tuning knobs ---
/** max |angle difference| from calibrated angle before we call it a false positive (degrees) */
const MAX_ANGLE_DIFF = 45;
/** max |x|+|y|+|z| center offset from calibrated position (all coords are 0-1) */
const MAX_CENTER_OFFSET = 0.5;
/** current shoulder width must be at least this fraction of calibrated width */
const MIN_SIZE_RATIO = 0.5;


export interface Points {
  head: { x: number; y: number; z: number };
  shoulderL: { x: number; y: number; z: number };
  shoulderR: { x: number; y: number; z: number };
  hipL: { x: number; y: number; z: number };
  hipR: { x: number; y: number; z: number };
}

/** 3 comparison params from the torso skeleton: angle, position, size */
export interface TorsoFeatures {
  /** angle of torso line (shoulder-mid -> hip-mid) in degrees, 0 = upright */
  angle: number;
  /** average of shoulder + hip points = body position */
  center: { x: number; y: number; z: number };
  /** distance between shoulders = rough distance to camera */
  shoulderWidth: number;
}

export function torsoFeatures(p: Points): TorsoFeatures {
  const shoulderMid = {
    x: (p.shoulderL.x + p.shoulderR.x) / 2,
    y: (p.shoulderL.y + p.shoulderR.y) / 2,
    z: (p.shoulderL.z + p.shoulderR.z) / 2,
  };
  const hipMid = {
    x: (p.hipL.x + p.hipR.x) / 2,
    y: (p.hipL.y + p.hipR.y) / 2,
    z: (p.hipL.z + p.hipR.z) / 2,
  };
  const angle =
    (Math.atan2(hipMid.x - shoulderMid.x, hipMid.y - shoulderMid.y) * 180) /
    Math.PI;
  const center = {
    x: (shoulderMid.x + hipMid.x) / 2,
    y: (shoulderMid.y + hipMid.y) / 2,
    z: (shoulderMid.z + hipMid.z) / 2,
  };
  const shoulderWidth = Math.hypot(
    p.shoulderL.x - p.shoulderR.x,
    p.shoulderL.y - p.shoulderR.y,
  );
  return { angle, center, shoulderWidth };
}

/** true if a frame's features roughly match the calibrated seating position */
export function matchesSeat(current: TorsoFeatures, seated: TorsoFeatures): boolean {
  if (Math.abs(current.angle - seated.angle) > MAX_ANGLE_DIFF) return false;
  const offset =
    Math.abs(current.center.x - seated.center.x) +
    Math.abs(current.center.y - seated.center.y) +
    Math.abs(current.center.z - seated.center.z);
  if (offset > MAX_CENTER_OFFSET) return false;
  if (current.shoulderWidth < seated.shoulderWidth * MIN_SIZE_RATIO) return false;
  return true;
}

/** reduce 33 raw landmarks to our 5 torso points (head = midpoint between ears) */
function extractPoints(lm: { x: number; y: number; z: number }[]): Points {
  const mid = (a: (typeof lm)[0], b: (typeof lm)[0]) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  });
  return {
    head: mid(lm[7], lm[8]), // ears
    shoulderL: lm[11],
    shoulderR: lm[12],
    hipL: lm[23],
    hipR: lm[24],
  };
}

export function useTracker() {
  // camera only ever starts from an explicit user click
  const [isRunning, setIsRunning] = useState(false);
  const pointsRef = useRef<Points | null>(null);
  const seatedRef = useRef<TorsoFeatures | null>(null);

  const start = () => setIsRunning(true);
  const stop = () => setIsRunning(false);

  // camera + pose landmark detection, extracts + filters our 5 torso points
  useEffect(() => {
    if (!isRunning) return;
    let cancelled = false;
    let landmarker: PoseLandmarker | null = null;
    let stream: MediaStream | null = null;
    let raf = 0;
    const video = document.createElement("video");
    video.playsInline = true;
    const smoother = new LandmarkOneEuro();
    let lastVideoTime = -1;
    let frame = 0;

    (async () => {
      try {
        landmarker = await createLandmarker("lite");
        if (cancelled) return;
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
      } catch (err) {
        console.error("tracker camera/model failed:", err);
        return;
      }
      const loop = () => {
        if (cancelled) return;
        if (frame++ % 10 === 0) {
          if (video.currentTime !== lastVideoTime && landmarker) {
            lastVideoTime = video.currentTime;
            const result = landmarker.detectForVideo(video, performance.now());
            for (const raw of result.landmarks ?? []) {
              const points = extractPoints(smoother.smooth(raw));
              pointsRef.current = points;
              const f = torsoFeatures(points);
              const s = seatedRef.current;
              if (s) setSeated(matchesSeat(f, s));
              else console.log("torso", f);
            }
          }
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      smoother.reset();
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
      landmarker?.close();
    };
  }, [isRunning]);

  // store current 5 points as the calibrated camera position
  const capture = useCallback(() => {
    if (!pointsRef.current) return;
    localStorage.setItem(POS_KEY, JSON.stringify(pointsRef.current));
    const f = torsoFeatures(pointsRef.current);
    seatedRef.current = f;
    console.log("stored camera position", f);
  }, []);

  return { isRunning, start, stop, capture, seated };
}

export type Tracker = ReturnType<typeof useTracker>;

/** corner widget shown on clock page while tracker is active */
export function TrackerWidget({
  tracker,
  onOpen,
}: {
  tracker: Tracker;
  onOpen: () => void;
}) {
  if (!tracker.isRunning) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className="px-3 py-1 rounded bg-white text-black text-lg z-10"
    >
      🪑
    </button>
  );
}

export default function TrackerApp({
  tracker,
  onClose,
}: {
  tracker: Tracker;
  onClose: () => void;
}) {
  const { isRunning, start, stop, capture, seated } = tracker;

  return (
    <div className="absolute inset-0" onClick={onClose}>
      <div
        className="absolute w-[300px] left-1/2 -translate-x-1/2 bottom-2 p-4 bg-white/50 text-black rounded z-10 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="self-end py-1 px-2 text-2xl hover:opacity-70"
        >
          ×
        </button>

        <h2 className="text-2xl mb-2">Seating tracker</h2>

        {isRunning && <div className="mb-2 text-lg">{seated ? "At desk" : "Not at desk"}</div>}

        <button
          onClick={isRunning ? stop : start}
          className="px-8 py-2 rounded-lg border border-current"
        >
          {isRunning ? "Stop" : "Start"}
        </button>

        {isRunning && (
          <button
            onClick={capture}
            className="mt-2 px-4 py-1 rounded-lg border border-current text-sm"
          >
            Set camera position
          </button>
        )}
      </div>
    </div>
  );
}
