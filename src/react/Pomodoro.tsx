import { useEffect, useRef, useState } from 'react';
import { useNotificationSound } from './Chime';

type Mode = 'focus' | 'break';

interface SavedState {
  duration: number;
  focusMin: number;
  breakMin: number;
  mode: Mode;
  startTime: number | null;
}

const DEFAULT_STATE: SavedState = { duration: 40 * 60 * 1000, focusMin: 40, breakMin: 5, mode: 'focus', startTime: null };

function loadState(): SavedState {
  try {
    const saved = localStorage.getItem('pomodoro-state');
    if (saved) return { ...DEFAULT_STATE, ...JSON.parse(saved) };
  } catch (e) {
    console.error('Failed to load pomodoro state:', e);
  }
  return DEFAULT_STATE;
}

export function usePomodoro() {
  const [state, setState] = useState<SavedState>(loadState);
  const beepedRef = useRef(false);
  const playNotif = useNotificationSound();

  useEffect(() => {
    localStorage.setItem('pomodoro-state', JSON.stringify(state));
  }, [state]);

  const startTime = state.startTime;
  const isRunning = startTime !== null;

  const [, tick] = useState(0);
  useEffect(() => {
    if (!isRunning) return;
    beepedRef.current = false;
    const id = setInterval(() => {
      tick((t) => t + 1);
      if (startTime !== null && Date.now() - startTime >= state.duration && !beepedRef.current) {
        beepedRef.current = true;
        playNotif();
        // interval finished: keep counting into the negative until the user advances
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, startTime, state.duration]);

  const remaining = isRunning && startTime !== null ? state.duration - (Date.now() - startTime) : state.duration;
  const isOvertime = isRunning && remaining < 0;

  const start = () => setState((s) => ({
    ...s,
    mode: 'focus' as Mode, // always start with a work interval
    duration: s.focusMin * 60000,
    startTime: Date.now(),
  }));
  const stop = () => setState((s) => ({ ...s, mode: 'focus' as Mode, duration: s.focusMin * 60000, startTime: null }));

  // user confirms the finished interval: work -> break, break -> idle work
  const advance = () => setState((s) => {
    if (s.mode === 'focus') {
      return { ...s, mode: 'break' as Mode, duration: s.breakMin * 60000, startTime: Date.now() };
    }
    playNotif();
    return { ...s, mode: 'focus' as Mode, duration: s.focusMin * 60000, startTime: null };
  });

  const setFocusMin = (m: number) =>
    setState((s) => ({ ...s, focusMin: m, duration: s.mode === 'focus' ? m * 60000 : s.duration, startTime: s.mode === 'focus' ? null : s.startTime }));

  const setBreakMin = (m: number) =>
    setState((s) => ({ ...s, breakMin: m, duration: s.mode === 'break' ? m * 60000 : s.duration, startTime: s.mode === 'break' ? null : s.startTime }));

  return { isRunning, remaining, isOvertime, mode: state.mode, focusMin: state.focusMin, breakMin: state.breakMin, start, stop, advance, setFocusMin, setBreakMin };
}

export type Pomodoro = ReturnType<typeof usePomodoro>;

export function formatMs(ms: number) {
  const totalSeconds = Math.ceil(Math.abs(ms) / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const sign = ms < 0 ? '-' : '';
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** corner widget shown on clock page while pomodoro is active */
export function PomodoroWidget({ pomo, onOpen }: { pomo: Pomodoro; onOpen: () => void }) {
  if (!pomo.isRunning) return null;
  const minutes = Math.ceil(Math.abs(pomo.remaining) / 60000);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      className="button text-lg z-10"
    >
      🍅 {pomo.remaining < 0 ? `+${minutes}m` : `${minutes}m`}
    </button>
  );
}

export default function PomodoroPage({ pomo }: { pomo: Pomodoro }) {
  const { isRunning, remaining, isOvertime, mode, focusMin, breakMin, start, stop, advance, setFocusMin, setBreakMin } = pomo;

  return (
    <>
      <h2 className="text-2xl mb-2 text-center">{mode === 'focus' ? 'Work' : 'Break'}</h2>

        <span className="text-6xl font-bold tracking-wider mb-4">{formatMs(remaining)}</span>

        {!isRunning && (
          <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-1 text-sm">
            Work
            <input
              type="number" min={1}
              value={focusMin}
              disabled={isRunning && mode === 'focus'}
              onChange={(e) => setFocusMin(Math.max(1, Number(e.target.value) || 0))}
              className="w-16 text-center"
            />
            min
          </label>
          <label className="flex items-center gap-1 text-sm">
            Break
            <input
              type="number" min={1}
              value={breakMin}
              disabled={isRunning && mode === 'break'}
              onChange={(e) => setBreakMin(Math.max(1, Number(e.target.value) || 0))}
              className="w-16 text-center"
            />
            min
          </label>
          </div>
        )}

        <button onClick={isOvertime ? advance : isRunning ? stop : start}
          className="button w-full text-lg">
          {isOvertime ? (mode === 'focus' ? 'Start break' : 'Finish') : isRunning ? 'Stop' : 'Start'}
        </button>
    </>
  );
}
