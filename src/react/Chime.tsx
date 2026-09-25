import { useEffect, useRef } from 'react';
import { playChime, randomChord } from '../lib/tone';
import { titleCase } from './state';

// custom sound files: drop .mp3/.ogg/.wav/.m4a files into public/sounds/
export const soundFiles: { name: string; url: string }[] = Object.entries(
  import.meta.glob('/public/sounds/*.{mp3,ogg,wav,m4a}', { query: '?url', import: 'default', eager: true }),
).map(([path, url]) => ({ name: path.split('/').pop()!, url: url as string }));

// in minutes
export const chimeIntervals = [0, 1, 5, 15, 20, 30, 60]; // 1 min only for dev testing

// file types appear as options in the type dropdown, e.g. gong1.mp3 -> 'Gong 1'
const fileTypes = soundFiles.map((f) => ({
  value: `file:${f.name}`,
  label: titleCase(
    f.name
      // strip freesound prefix '123456__author__'
      .replace(/^\d+__[^_]+__/, '')
      .replace(/\.[^.]+$/, '')
      .replace(/([a-z])(\d)/, '$1 $2')
      .replace(/[-_]/g, ' ')
  ),
}));
const chimeTypes = [
  { value: 'chime', label: 'Chime' },
  { value: 'jazzy', label: 'Jazzy' },
  ...fileTypes,
];

export function playChimeType(type: string) {
  if (type === 'chime') playChime();
  else if (type === 'jazzy') randomChord();
  else if (type.startsWith('file:')) {
    const name = type.slice(5);
    const url = soundFiles.find((f) => f.name === name)?.url;
    if (url) void new Audio(url).play().catch(() => {});
  }
}

export function useChime({ type, interval }: { type: string; interval: number }) {
  const lastMinute = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const m = d.getHours() * 60 + d.getMinutes();
      if (lastMinute.current === null) {
        lastMinute.current = m;
        return;
      }
      if (lastMinute.current === m) return;
      lastMinute.current = m;
      if (interval > 0 && m % interval === 0) playChimeType(type);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [type, interval]);
}

export default function Chime({
  type,
  setType,
  interval,
  setInterval_,
  onBack,
}: {
  type: string;
  setType: (v: string) => void;
  interval: number;
  setInterval_: (v: number) => void;
  onBack: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-y-1 gap-x-2">
      <div className="col-span-full">
        <button onClick={onBack} className="px-2 py-1 hover:bg-gray-200">
          ← 🔔 Chime
        </button>
      </div>

      <label htmlFor="chime-interval" className="flex justify-between items-center">
        Interval
      </label>
      <select
        id="chime-interval"
        value={interval}
        onChange={(e) => setInterval_(Number(e.target.value))}
        className="w-full px-2 py-1 border border-gray-600 rounded-md bg-white text-black"
      >
        {chimeIntervals.map((i) => (
          <option key={i} value={i}>
            {i === 0 ? 'Off' : i === 60 ? 'Hourly' : `${i} min`}
          </option>
        ))}
      </select>

      <label htmlFor="chime-type" className="flex justify-between items-center">
        Type
      </label>
      <select
        id="chime-type"
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full px-2 py-1 border border-gray-600 rounded-md bg-white text-black"
      >
        {chimeTypes.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <div className="col-span-full">
        <button onClick={() => playChimeType(type)} className="w-full px-2 py-1 rounded hover:bg-gray-200">
          ▶ Test
        </button>
      </div>
    </div>
  );
}
