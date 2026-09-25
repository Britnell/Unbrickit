import { useEffect, useRef, useState } from 'react';
import { playTimerBeep } from '../lib/tone';

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
        playTimerBeep();
        // interval finished: advance work -> break -> work
        setState((s) => {
          const mode: Mode = s.mode === 'focus' ? 'break' : 'focus';
          return { ...s, mode, duration: mode === 'focus' ? s.focusMin * 60000 : s.breakMin * 60000, startTime: Date.now() };
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, startTime, state.duration]);

  const remaining = isRunning && startTime !== null ? state.duration - (Date.now() - startTime) : state.duration;

  const start = () => setState((s) => ({
    ...s,
    mode: 'focus' as Mode, // always start with a work interval
    duration: s.focusMin * 60000,
    startTime: Date.now(),
  }));
  const stop = () => setState((s) => ({ ...s, mode: 'focus' as Mode, duration: s.focusMin * 60000, startTime: null }));

  const setFocusMin = (m: number) =>
    setState((s) => ({ ...s, focusMin: m, duration: s.mode === 'focus' ? m * 60000 : s.duration, startTime: s.mode === 'focus' ? null : s.startTime }));

  const setBreakMin = (m: number) =>
    setState((s) => ({ ...s, breakMin: m, duration: s.mode === 'break' ? m * 60000 : s.duration, startTime: s.mode === 'break' ? null : s.startTime }));

  return { isRunning, remaining, mode: state.mode, focusMin: state.focusMin, breakMin: state.breakMin, start, stop, setFocusMin, setBreakMin };
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
      className="px-3 py-3 rounded bg-white text-black text-lg z-10"
    >
      🍅 {minutes}m
    </button>
  );
}

export default function PomodoroApp({ pomo, onClose }: { pomo: Pomodoro; onClose: () => void }) {
  const { isRunning, remaining, mode, focusMin, breakMin, start, stop, setFocusMin, setBreakMin } = pomo;

  return (
    <div className="absolute inset-0" onClick={onClose}>
      <div
        className="absolute w-[300px] left-1/2 -translate-x-1/2 bottom-2 p-4 bg-white/50 text-black rounded z-10 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="self-end py-1 px-2 text-2xl hover:opacity-70">×</button>

        <h2 className="text-2xl mb-2">{mode === 'focus' ? 'Work' : 'Break'}</h2>

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
              className="w-16 px-2 py-1 rounded bg-white text-black text-center"
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
              className="w-16 px-2 py-1 rounded bg-white text-black text-center"
            />
            min
          </label>
          </div>
        )}

        <button onClick={isRunning ? stop : start}
          className="px-8 py-4 rounded-lg border border-current text-lg">
          {isRunning ? 'Stop' : 'Start'}
        </button>
      </div>
    </div>
  );
}
