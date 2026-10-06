import { useAtomValue } from 'jotai';
import { themeAtom, clockTimeAtom } from './atoms';

export default function Clock() {
  const { font, fontSize, fontWeight } = useAtomValue(themeAtom);
  const time = useAtomValue(clockTimeAtom);
  const d = new Date(time);

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <span
        className={`select-none leading-none font-${font}`}
        style={{ fontSize: `${fontSize}vw`, fontWeight }}
      >
        {String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}
      </span>
    </div>
  );
}
