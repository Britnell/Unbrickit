import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { themeAtom } from './atoms';

export default function Clock() {
  const { font, fontSize, fontWeight } = useAtomValue(themeAtom);
  const [time, setTime] = useState(() => formatTime());

  useEffect(() => {
    const t = new Date();
    const nextSecond = 1000 - t.getMilliseconds();
    const timeout = setTimeout(() => {
      const id = setInterval(() => setTime(formatTime()), 1000);
      setTime(formatTime());
      return () => clearInterval(id);
    }, nextSecond);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <span
        className={`select-none leading-none font-${font}`}
        style={{ fontSize: `${fontSize}vw`, fontWeight }}
      >
        {time}
      </span>
    </div>
  );
}

function formatTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
