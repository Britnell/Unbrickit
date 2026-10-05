import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { createLandmarker } from "./poseLandmarker";
import { acquireCamera, releaseCamera } from "./camera";
import { LandmarkOneEuro } from "./filter";
import { useNotificationSound } from "./Chime";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";

const POS_KEY = "seating-position";
const HOURS_KEY = "seating-hours";
const RUNNING_KEY = "seating-running";

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
const MAX_ANGLE_DIFF = 55;
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
 * Max distance from the calibrated position, 0..1.
 * Each factor is diff/threshold; 1 = that factor hit its threshold.
 */
export function seatDistance(
  current: TorsoFeatures,
  seated: TorsoFeatures,
): number {
  const angleDiff = Math.abs(current.angle - seated.angle) / MAX_ANGLE_DIFF;
  const centerOffset =
    (Math.abs(current.center.x - seated.center.x) +
      Math.abs(current.center.y - seated.center.y)) /
    MAX_CENTER_OFFSET;
  // shoulder width: 0 when matching, 1 when width dropped to MIN_SIZE_RATIO
  const sizeDiff =
    Math.max(0, 1 - current.shoulderWidth / seated.shoulderWidth) /
    (1 - MIN_SIZE_RATIO);
  return Math.max(angleDiff, centerOffset, sizeDiff);
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

/* --------------------------------- atoms ---------------------------------- */
// Only genuinely shared/persisted seating state lives in atoms. Everything
// else (isRunning, seated, distance, ...) is local useState in the engine.

/** minutes seated per hour, persisted */
export const hoursAtom = atomWithStorage<HoursData>(HOURS_KEY, freshHours());
/** seating reminder interval in minutes, persisted */
export const reminderAtom = atomWithStorage<number>("seating-reminder", 45);

export const seatedMinutesTodayAtom = atom((get) =>
  get(hoursAtom).hours.reduce((a, b) => a + b, 0),
);

/** display snapshot the page/widget read; engine is the only writer */
export interface SeatingUi {
  isRunning: boolean;
  seated: boolean;
  distance: number;
  seatedMs: number;
  overdue: boolean;
}
export const seatingUiAtom = atom<SeatingUi>({
  isRunning: false,
  seated: false,
  distance: 0,
  seatedMs: 0,
  overdue: false,
});

// start/stop actions: just flip isRunning in the snapshot, the engine reacts
export const startSeatingAtom = atom(null, (_get, set) => {
  set(seatingUiAtom, (ui) => ({ ...ui, isRunning: true }));
  sessionStorage.setItem(RUNNING_KEY, "1");
});
export const stopSeatingAtom = atom(null, (_get, set) => {
  set(seatingUiAtom, (ui) => ({ ...ui, isRunning: false }));
  sessionStorage.removeItem(RUNNING_KEY);
});

// shared between engine and capture so the page can calibrate
// plain module singletons (NOT useRef — that's a hook and can't run at module scope)
const livePointsRef: { current: Points | null } = { current: null };
const calibRefGlobal: { current: TorsoFeatures | null } = { current: null };

/** store current 5 points as the calibrated camera position */
export function useCaptureSeat() {
  return useCallback(() => {
    if (!livePointsRef.current) return;
    localStorage.setItem(POS_KEY, JSON.stringify(livePointsRef.current));
    calibRefGlobal.current = torsoFeatures(livePointsRef.current);
  }, []);
}

/* --------------------------------- engine --------------------------------- */

/**
 * Mount once (App). Owns the camera loop + timers; keeps per-frame state as
 * local useState and publishes only the display snapshot into seatingUiAtom.
 */
export function useSeatingEngine() {
  const setHoursData = useSetAtom(hoursAtom);
  const isRunning = useAtomValue(seatingUiAtom).isRunning; // toggled by page buttons
  const setUi = useSetAtom(seatingUiAtom);
  const hoursDate = useAtomValue(hoursAtom).date;
  const reminderMinutes = useAtomValue(reminderAtom);
  const playNotif = useNotificationSound();

  // reset stored hours when the day changes (checked on mount + every minute)
  useEffect(() => {
    const check = () => {
      if (!sameDay(hoursDate, todayStr())) setHoursData(freshHours());
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [hoursDate, setHoursData]);

  // local state: only consumed here + mirrored into the UI snapshot
  const [seated, setSeated] = useState(false);
  const [distance, setDistance] = useState(0);
  const [seatedSince, setSeatedSince] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const pointsRef = livePointsRef;
  const calibRef = calibRefGlobal;
  // restore saved calibration so detection works right after (re)load
  const saved = localStorage.getItem(POS_KEY);
  if (saved && !calibRef.current) {
    try {
      calibRef.current = torsoFeatures(JSON.parse(saved) as Points);
    } catch {
      /* ignore corrupt data */
    }
  }

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

  // restart after reload if the user had it running and camera permission persists
  useEffect(() => {
    if (!sessionStorage.getItem(RUNNING_KEY)) return;
    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((p) => {
        if (p.state === "granted") setUi((ui) => ({ ...ui, isRunning: true }));
      })
      .catch(() => {
        /* permissions API unsupported: don't auto-start */
      });
  }, [setUi]);

  // camera + pose landmark detection, extracts + filters our 5 torso points
  useEffect(() => {
    if (!isRunning) return;
    let cancelled = false;
    let landmarker: PoseLandmarker | null = null;
    let ownsCamera = false;
    let raf = 0;
    let video: HTMLVideoElement;
    const smoother = new LandmarkOneEuro();
    let lastVideoTime = -1;
    let frame = 0;

    (async () => {
      try {
        landmarker = await createLandmarker("lite");
        if (cancelled) return;
        video = await acquireCamera();
        ownsCamera = true;
        if (cancelled) {
          releaseCamera();
          return;
        }
      } catch (err) {
        console.error("seating camera/model failed:", err);
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
      if (ownsCamera) releaseCamera();
      landmarker?.close();
    };
  }, [isRunning]);

  // counter starts when the user sits down, resets when they get up
  useEffect(() => {
    setNow(Date.now());
    setSeatedSince(seated ? Date.now() : null);
  }, [seated]);

  // keep the displayed counter ticking while seated, +1 minute per hour bucket
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
      playNotif();
      toast(`You've been seated for ${reminderMinutes} min — time to move! 🪑`);
    }
  }, [overdue, seatedSince, playNotif]);

  // publish display snapshot for the page/widget
  useEffect(() => {
    setUi((ui) =>
      ui.seated === seated &&
      ui.distance === distance &&
      ui.seatedMs === seatedMs &&
      ui.overdue === overdue
        ? ui
        : { isRunning: ui.isRunning, seated, distance, seatedMs, overdue },
    );
  }, [seated, distance, seatedMs, overdue, setUi]);
}

/* --------------------------------- views ---------------------------------- */

/** corner widget shown on clock page while seating is active */
export function SeatingWidget({ onOpen }: { onOpen: () => void }) {
  const { isRunning, seated, overdue, seatedMs } =
    useAtomValue(seatingUiAtom);
  if (!isRunning) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className="button text-lg z-10"
    >
      {seated ? "🪑" : "🕳️"}{" "}
      {overdue
        ? "!"
        : seated
          ? Math.floor(seatedMs / 60000) + "m"
          : ""}
    </button>
  );
}

export default function SeatingPage() {
  const { isRunning, seated, seatedMs, distance, overdue } =
    useAtomValue(seatingUiAtom);
  const start = useSetAtom(startSeatingAtom);
  const stop = useSetAtom(stopSeatingAtom);
  const capture = useCaptureSeat();
  const [reminder, setReminder] = useAtom(reminderAtom);
  const seatedMinutesToday = useAtomValue(seatedMinutesTodayAtom);

  return (
    <div className="flex flex-col flex-wrap max-h-[calc(100svh-5rem)]">
    <div className="flex flex-col min-w-[200px]">
                    {isRunning && !seated && (
            <div className="mb-2 bg-white/30 px-2 py-1 rounded text-center">
              <div className="text-4xl">🕳️</div>
              <div className="text-lg">Not at desk</div>
              <div className="text-3xl tabular-nums">
                0<span className="text-lg text-gray-500"> min</span>
              </div>
            </div>
          )}

          {isRunning && seated && (
            <div className="mb-2 bg-white/30 px-2 py-1 rounded text-center">
              <div className="text-4xl">🪑</div>
              <div className="text-lg">At desk</div>
              <div className="text-3xl tabular-nums">
                {Math.floor(seatedMs / 60000)}:
                {String(Math.floor((seatedMs % 60000) / 1000)).padStart(
                  2,
                  "0",
                )}
                <span className="text-lg text-gray-500"> min</span>
              </div>
            </div>
          )}

          <div className="mb-2 text-lg tabular-nums">
            {seatedMinutesToday >= 60 && (
              <>Total today: {Math.floor(seatedMinutesToday / 60)}h{" "}
              {seatedMinutesToday % 60}m</>
            )}
            {seatedMinutesToday < 60 && <>Total today: {seatedMinutesToday}m</>}
          </div>

          <button
            onClick={isRunning ? stop : start}
            className="button mb-2 w-full"
          >
            {isRunning ? "Stop" : "Start"}
          </button>

          {overdue && (
            <div className="mb-2 text-lg">⏰ Time for a break!</div>
          )}
        </div>

        <div className="flex flex-col min-w-[200px] p-2">
          <label className="text-sm self-start">Seating reminder</label>
          <select
            value={reminder}
            onChange={(e) => setReminder(Number(e.target.value))}
            className="mb-2 w-full text-sm"
          >
            {reminderIntervals.map((i) => (
              <option key={i} value={i}>
                {i === 0 ? "Off" : `${i} min`}
              </option>
            ))}
          </select>

          {isRunning && (
            <>
              <label className="text-sm self-start">Seating position</label>
              <progress
                className="mb-2"
                max={1}
                value={Math.max(0, Math.floor((1 - distance) * 5) / 5)}
              ></progress>
            </>
          )}

          {isRunning && (
            <button
              onClick={capture}
              className="button mt-2 w-full text-sm"
            >
              Set camera position
            </button>
          )}
        </div>
    </div>
  );
}
