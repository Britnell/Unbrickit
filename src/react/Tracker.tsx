import { useCallback, useEffect, useRef, useState } from "react";
import { createLandmarker } from "./poseLandmarker";
import { LandmarkOneEuro } from "./filter";
import { useLocalStorage } from "./useLocalStorage";
import { playChimeType } from "./Chime";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";

const POS_KEY = "tracker-position";
const HOURS_KEY = "tracker-hours";

interface HoursData {
  /** date string, e.g. 2025-01-31; if not today, data is from a previous day */
  date: string;
  /** minutes seated per hour, index 0 = 00:00-00:59 */
  hours: number[];
}

function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function freshHours(): HoursData {
  return { date: todayStr(), hours: Array.from({ length: 24 }, () => 0) };
}

function sameDay(a: string, b: string) {
  return a === b;
}

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

/**
 * Combined distance from the calibrated position, 0..1.
 * Each factor contributes diff/threshold; the three are summed, then scaled
 * so sum=1 (seated threshold hit) -> 0.5, sum=2 (double threshold) -> 1.
 */
export function seatDistance(
  current: TorsoFeatures,
  seated: TorsoFeatures,
): number {
  const angleDiff = Math.abs(current.angle - seated.angle) / MAX_ANGLE_DIFF;
  const centerOffset =
    (Math.abs(current.center.x - seated.center.x) +
      Math.abs(current.center.y - seated.center.y) +
      Math.abs(current.center.z - seated.center.z)) /
    MAX_CENTER_OFFSET;
  // shoulder width: 0 when matching, 1 when width dropped to MIN_SIZE_RATIO
  const sizeDiff =
    Math.max(0, 1 - current.shoulderWidth / seated.shoulderWidth) /
    (1 - MIN_SIZE_RATIO);
  return Math.min(1, (angleDiff + centerOffset + sizeDiff) / 2);
}

/** true if a frame's features roughly match the calibrated seating position */
export function matchesSeat(
  current: TorsoFeatures,
  seated: TorsoFeatures,
): boolean {
  if (Math.abs(current.angle - seated.angle) > MAX_ANGLE_DIFF) return false;
  const offset =
    Math.abs(current.center.x - seated.center.x) +
    Math.abs(current.center.y - seated.center.y) +
    Math.abs(current.center.z - seated.center.z);
  if (offset > MAX_CENTER_OFFSET) return false;
  if (current.shoulderWidth < seated.shoulderWidth * MIN_SIZE_RATIO)
    return false;
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

// in minutes
export const reminderIntervals = [0, 30, 45, 60];

export function useTracker({
  reminderMinutes,
  chimeType,
}: {
  reminderMinutes: number;
  chimeType: string;
}) {
  // camera only ever starts from an explicit user click
  const [isRunning, setIsRunning] = useState(false);
  const pointsRef = useRef<Points | null>(null);
  const calibRef = useRef<TorsoFeatures | null>(null);
  // restore saved calibration so detection works right after (re)load
  const saved = localStorage.getItem(POS_KEY);
  if (saved) {
    try {
      calibRef.current = torsoFeatures(JSON.parse(saved) as Points);
    } catch {
      /* ignore corrupt data */
    }
  }
  const [seated, setSeated] = useState(false);
  const [distance, setDistance] = useState(0);
  const [seatedSince, setSeatedSince] = useState<number | null>(null);

  // minutes seated per hour of the current day, persisted in localStorage
  const [hoursData, setHoursData] = useLocalStorage<HoursData>(
    HOURS_KEY,
    freshHours(),
  );
  if (!sameDay(hoursData.date, todayStr())) setHoursData(freshHours());

  // add one seated-minute to the current hour bucket
  const addSeatedMinute = useCallback(() => {
    setHoursData((d) =>
      sameDay(d.date, todayStr())
        ? {
            ...d,
            hours: d.hours.map((m, h) =>
              h === new Date().getHours() ? m + 1 : m,
            ),
          }
        : freshHours(),
    );
  }, [setHoursData]);

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
            const landmarks = result.landmarks ?? [];
            if (landmarks.length === 0) {
              setSeated(false);
              setDistance(1);
            }
            for (const raw of landmarks) {
              const points = extractPoints(smoother.smooth(raw));
              pointsRef.current = points;
              const f = torsoFeatures(points);
              const s = calibRef.current;
              if (s) {
                const d = seatDistance(f, s);
                setSeated(matchesSeat(f, s));
                setDistance(d);
              }
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
    calibRef.current = f;
    console.log("stored camera position", f);
  }, []);

  // counter starts when the user sits down, resets when they get up
  useEffect(() => {
    setNow(Date.now());
    setSeatedSince(seated ? Date.now() : null);
  }, [seated]);

  // keep the displayed counter ticking while seated, +1 minute per hour bucket
  const [now, setNow] = useState(Date.now());
  const countedMinutesRef = useRef(0);
  useEffect(() => {
    if (seatedSince === null) {
      countedMinutesRef.current = 0;
      return;
    }
    const id = setInterval(() => {
      const nowMs = Date.now();
      setNow(nowMs);
      const whole = Math.floor((nowMs - seatedSince) / 60000);
      while (countedMinutesRef.current < whole) {
        countedMinutesRef.current++;
        addSeatedMinute();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [seatedSince, addSeatedMinute]);
  const seatedMs = seatedSince !== null ? now - seatedSince : 0;

  const seatedMinutesToday = hoursData.hours.reduce((a, b) => a + b, 0);

  // seating reminder: derived state + one-time chime
  const overdue =
    seated && reminderMinutes > 0 && seatedMs >= reminderMinutes * 60000;
  const chimedForRef = useRef<number | null>(null);
  useEffect(() => {
    if (!overdue) {
      chimedForRef.current = null;
      return;
    }
    if (chimedForRef.current !== seatedSince) {
      chimedForRef.current = seatedSince;
      playChimeType(chimeType);
    }
  }, [overdue, seatedSince, chimeType]);

  return {
    isRunning,
    start,
    stop,
    capture,
    seated,
    seatedSince,
    seatedMs,
    distance,
    hours: hoursData.hours,
    seatedMinutesToday,
    overdue,
  };
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
      {tracker.seated ? "🪑" : "🕳️"}{" "}
      {tracker.overdue
        ? "!"
        : tracker.seated
          ? Math.floor(tracker.seatedMs / 60000) + "m"
          : ""}
    </button>
  );
}

export default function TrackerApp({
  tracker,
  reminder,
  setReminder,
  onClose,
}: {
  tracker: Tracker;
  reminder: number;
  setReminder: (v: number) => void;
  onClose: () => void;
}) {
  const { isRunning, start, stop, capture, seated, seatedMs, distance } =
    tracker;

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

        {isRunning && (
          <div className="mb-2 text-lg">
            {seated ? "🪑 At desk" : "🕳️ Not at desk"}
          </div>
        )}

        {isRunning && (
          <progress
            className="mb-2 w-full"
            max={1}
            value={distance}
          ></progress>
        )}

        {isRunning && seated && (
          <div className="mb-2 text-3xl tabular-nums">
            {Math.floor(seatedMs / 60000)}m
          </div>
        )}

        {tracker.overdue && (
          <div className="mb-2 text-lg">�⏰ Time for a break!</div>
        )}

        <div className="mb-2 text-lg tabular-nums">
          Total today: {Math.floor(tracker.seatedMinutesToday / 60)}h{" "}
          {tracker.seatedMinutesToday % 60}m
        </div>

        <label className="text-sm">Seating reminder</label>
        <select
          value={reminder}
          onChange={(e) => setReminder(Number(e.target.value))}          className="mb-2 w-full px-2 py-1 border border-gray-600 rounded-md bg-white text-black text-sm"
        >
          {reminderIntervals.map((i) => (
            <option key={i} value={i}>
              {i === 0 ? "Off" : `${i} min`}
            </option>
          ))}
        </select>

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
