import { useCallback, useEffect, useRef, useState } from "react";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { clockTimeAtom } from "./atoms";
import { atomWithStorage } from "jotai/utils";
import { headPose } from "./face";
import { subscribeFace } from "./faceStream";
import { useNotificationSound } from "./Chime";
import type {
  FaceLandmarker,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";

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

// --- face comparison tuning knobs ---
/** max |roll| difference from calibrated pose before we call it a false positive (degrees) */
const MAX_ROLL_DIFF = 60;
/** current face size must be at least this fraction of the calibrated size (rejects background faces) */
const MIN_SIZE_RATIO = 0.5;
/** user must be undetected this long before we mark them as not detected */
const NOT_DETECTED_DEBOUNCE_MS = 10_000;

/** comparison params from the face: size + head rotation */
export interface FaceFeatures {
  /** bounding-box diagonal of the face landmarks = rough distance to camera */
  size: number;
  roll: number;
  yaw: number;
  pitch: number;
}

/** face landmarks + transformation matrix -> size + head pose */
export function faceFeatures(
  lm: NormalizedLandmark[],
  face: ReturnType<FaceLandmarker["detectForVideo"]>,
): FaceFeatures | null {
  const pose = headPose(face);
  if (!pose) return null;
  let minX = 1,
    maxX = 0,
    minY = 1,
    maxY = 0;
  for (const p of lm) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    size: Math.hypot(maxX - minX, maxY - minY),
    roll: pose.roll,
    yaw: pose.yaw,
    pitch: pose.pitch,
  };
}

/**
 * Max distance from the calibrated face, 0..1.
 * Each factor is diff/threshold; 1 = that factor hit its threshold.
 */
export function seatDistance(
  current: FaceFeatures,
  seated: FaceFeatures,
): number {
  const rollDiff = Math.abs(current.roll - seated.roll) / MAX_ROLL_DIFF;
  // face size: 0 when matching, 1 when size dropped to MIN_SIZE_RATIO
  const sizeDiff =
    Math.max(0, 1 - current.size / seated.size) / (1 - MIN_SIZE_RATIO);
  return Math.max(rollDiff, sizeDiff);
}

/** true if a frame's features roughly match the calibrated seating position */
type SeatState = { seated: boolean; distance: number };

/**
 * Debounced presence/seated state machine.
 *
 * A "good" frame = user detected AND matching the calibrated seat.
 * Good frames refresh the grace clock and keep the user seated. Anything
 * else — no landmarks, or junk that doesn't match — is tolerated for
 * NOT_DETECTED_DEBOUNCE_MS; only after that do we report the user as gone.
 *
 * update() returns the state to publish, or null to change nothing.
 */
function createSeatTracker() {
  let lastGoodFrameMs = performance.now();
  let seated = false;

  return function update(
    frame: { present: boolean; matched: boolean; distance: number },
    now: number,
  ): SeatState | null {
    const good = frame.present && frame.matched;
    if (good) lastGoodFrameMs = now;

    const next = good || !expired(lastGoodFrameMs, now); // grace period holds old state
    const changed = next !== seated;
    seated = next;

    if (good || changed)
      return { seated, distance: seated ? frame.distance : 1 };
    return null;
  };
}

/** true once now is more than the debounce past t */
function expired(t: number, now: number) {
  return now - t > NOT_DETECTED_DEBOUNCE_MS;
}

function evaluateFrame(
  face: ReturnType<FaceLandmarker["detectForVideo"]>,
  calib: FaceFeatures | null,
  tracker: ReturnType<typeof createSeatTracker>,
  now: number,
): { features: FaceFeatures | null; seat: SeatState | null } {
  const lm = face.faceLandmarks?.[0];
  const features = lm ? faceFeatures(lm, face) : null;
  // no face (or no head pose) at all
  if (!features || !calib) {
    return {
      features,
      seat: tracker({ present: false, matched: false, distance: 1 }, now),
    };
  }

  const seat = tracker(
    {
      present: true,
      matched: matchesSeat(features, calib),
      distance: seatDistance(features, calib),
    },
    now,
  );
  return { features, seat };
}

export function matchesSeat(
  current: FaceFeatures,
  seated: FaceFeatures,
): boolean {
  return seatDistance(current, seated) < 1;
}

// in minutes
export const reminderIntervals = [0, 20, 25, 30, 35, 40, 45, 50, 55, 60];

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
  /** a seating position has been calibrated (and stored) */
  calibrated: boolean;
}
export const seatingUiAtom = atom<SeatingUi>({
  isRunning: false,
  seated: false,
  distance: 0,
  seatedMs: 0,
  overdue: false,
  calibrated: localStorage.getItem(POS_KEY) !== null,
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
const liveFeaturesRef: { current: FaceFeatures | null } = { current: null };
const calibRefGlobal: { current: FaceFeatures | null } = { current: null };

/** store the current face features as the calibrated seating position */
export function useCaptureSeat() {
  const setUi = useSetAtom(seatingUiAtom);
  return useCallback(() => {
    if (!liveFeaturesRef.current) return;
    localStorage.setItem(POS_KEY, JSON.stringify(liveFeaturesRef.current));
    calibRefGlobal.current = liveFeaturesRef.current;
    setUi((ui) => ({ ...ui, calibrated: true }));
  }, [setUi]);
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
  const now = useAtomValue(clockTimeAtom);
  const hoursDate = useAtomValue(hoursAtom).date;
  const reminderMinutes = useAtomValue(reminderAtom);
  const playNotif = useNotificationSound();

  // reset stored hours when the day changes (re-checked every clock tick)
  useEffect(() => {
    if (!sameDay(hoursDate, todayStr())) setHoursData(freshHours());
  }, [now, hoursDate, setHoursData]);

  // local state: only consumed here + mirrored into the UI snapshot
  const [seated, setSeated] = useState(false);
  const [distance, setDistance] = useState(0);
  const [seatedSince, setSeatedSince] = useState<number | null>(null);

  const pointsRef = liveFeaturesRef;
  const calibRef = calibRefGlobal;
  // restore saved calibration so detection works right after (re)load
  const saved = localStorage.getItem(POS_KEY);
  if (saved && !calibRef.current) {
    try {
      const parsed = JSON.parse(saved) as Partial<FaceFeatures>;
      if (typeof parsed.size === "number")
        calibRef.current = parsed as FaceFeatures;
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

  // shared face stream: presence + size/rotation checks per frame
  useEffect(() => {
    if (!isRunning) return;
    const tracker = createSeatTracker();

    const unsub = subscribeFace(({ result: face, now }) => {
      try {
        const result = evaluateFrame(face, calibRef.current, tracker, now);
        if (result.features) pointsRef.current = result.features;
        if (result.seat) {
          setSeated(result.seat.seated);
          setDistance(result.seat.distance);
        }
      } catch (err) {
        console.error("[seating] detect failed:", err);
      }
    });
    return unsub;
  }, [isRunning]);

  // counter starts when the user sits down, resets when they get up
  useEffect(() => {
    setSeatedSince(seated ? Date.now() : null);
  }, [seated]);

  // count whole seated minutes into the current hour bucket (clock atom ticks re-renders)
  const countedMinutesRef = useRef(0);
  useEffect(() => {
    if (seatedSince === null) {
      countedMinutesRef.current = 0;
      return;
    }
    const whole = Math.floor((now - seatedSince) / 60000);
    while (countedMinutesRef.current < whole) {
      countedMinutesRef.current++;
      addSeatedMinute();
    }
  }, [now, seatedSince, addSeatedMinute]);

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
    }
  }, [overdue, seatedSince, playNotif]);

  // publish display snapshot for the page/widget
  useEffect(() => {
    const calibrated = calibRef.current !== null;
    setUi((ui) =>
      ui.seated === seated &&
      ui.distance === distance &&
      ui.seatedMs === seatedMs &&
      ui.overdue === overdue &&
      ui.calibrated === calibrated
        ? ui
        : {
            isRunning: ui.isRunning,
            seated,
            distance,
            seatedMs,
            overdue,
            calibrated,
          },
    );
  }, [seated, distance, seatedMs, overdue, setUi]);
}

/* --------------------------------- views ---------------------------------- */

function widgetLabel(seated: boolean, overdue: boolean, seatedMs: number) {
  if (!seated) return "🕳️";
  if (overdue) return "🪑 time's up";
  return `🪑 ${Math.floor(seatedMs / 60000)}m`;
}

/** corner widget shown on clock page while seating is active */
export function SeatingWidget({ onOpen }: { onOpen: () => void }) {
  const { isRunning, seated, overdue, seatedMs } = useAtomValue(seatingUiAtom);
  if (!isRunning) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className="button text-lg z-10"
    >
      {widgetLabel(seated, overdue, seatedMs)}
    </button>
  );
}

export default function SeatingPage() {
  const { isRunning, seated, seatedMs, distance, overdue, calibrated } =
    useAtomValue(seatingUiAtom);
  const start = useSetAtom(startSeatingAtom);
  const stop = useSetAtom(stopSeatingAtom);
  const capture = useCaptureSeat();
  const [reminder, setReminder] = useAtom(reminderAtom);
  const seatedMinutesToday = useAtomValue(seatedMinutesTodayAtom);

  return (
    <div className="flex flex-row flex-wrap w-max mx-auto gap-2 max-h-[calc(100svh-5rem)]">
      <div className="flex flex-col min-w-[200px]">
        {!calibrated && (
          <div className="mb-2 bg-red-500/70 px-3 py-2 rounded text-center">
            <div className="text-2xl">⚠️</div>
            <div className="text-lg font-bold">Camera not calibrated</div>
            <div className="text-sm">
              Sit at your desk, then press “Set camera position” — otherwise you
              won't be detected.
            </div>
          </div>
        )}

        {isRunning && !seated && calibrated && (
          <div className="mb-2 bg-white/30 px-2 py-1 rounded text-center">
            <div className="text-4xl">🕳️</div>
            <div className="text-lg">Not at desk</div>
            <div className="text-3xl tabular-nums">
              0<span className="text-lg text-gray-500"> min</span>
            </div>
          </div>
        )}

        {isRunning && seated && calibrated && (
          <div className="mb-2 bg-white/30 px-2 py-1 rounded text-center">
            <div className="text-4xl">🪑</div>
            <div className="text-lg">At desk</div>
            <div className="text-3xl tabular-nums">
              {Math.floor(seatedMs / 60000)}:
              {String(Math.floor((seatedMs % 60000) / 1000)).padStart(2, "0")}
              <span className="text-lg text-gray-500"> min</span>
            </div>
          </div>
        )}

        <div className="mb-2 text-lg tabular-nums">
          {seatedMinutesToday >= 60 && (
            <>
              Total today: {Math.floor(seatedMinutesToday / 60)}h{" "}
              {seatedMinutesToday % 60}m
            </>
          )}
          {seatedMinutesToday < 60 && <>Total today: {seatedMinutesToday}m</>}
        </div>

        <button
          onClick={isRunning ? stop : start}
          className="button mb-2 w-full"
        >
          {isRunning ? "Stop" : "Start"}
        </button>

        {overdue && <div className="mb-2 text-lg">⏰ Time for a break!</div>}
      </div>

      {isRunning && (
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

          <label className="text-sm self-start">Seating position</label>
          <progress
            className="mb-2"
            max={1}
            value={Math.max(0, Math.ceil((1 - distance) * 5) / 5)}
          ></progress>

          <button onClick={capture} className="button mt-2 w-full text-sm">
            Set camera position
          </button>
        </div>
      )}
    </div>
  );
}
