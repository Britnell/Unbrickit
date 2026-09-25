import { useEffect, useState } from 'react';

export default function Clock({
  font,
  fontSize,
  fontWeight,
}: {
  font: string;
  fontSize: number;
  fontWeight: number;
}) {
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
