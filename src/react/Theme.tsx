import { useAtom } from 'jotai';
import { themeAtom, timeOfDayAtom } from './atoms';
import { colorModes, fonts, formatHour, hourToHex, titleCase } from './state';

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <>
      <label htmlFor={label} className="flex justify-between items-center">
        {label}
        <span className="opacity-60">{value}{suffix}</span>
      </label>
      <input
        id={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </>
  );
}

export default function Theme({ onBack }: { onBack: () => void }) {
  const [theme, setTheme] = useAtom(themeAtom);
  const [timeOfDay, setTimeOfDay] = useAtom(timeOfDayAtom);
  const { font, fontSize, fontWeight, hue, colorMode, darkMode } = theme;
  const set = {
    font: (v: string) => setTheme((t) => ({ ...t, font: v })),
    fontSize: (v: number) => setTheme((t) => ({ ...t, fontSize: v })),
    fontWeight: (v: number) => setTheme((t) => ({ ...t, fontWeight: v })),
    hue: (v: number) => setTheme((t) => ({ ...t, hue: v })),
    colorMode: (v: string) => setTheme((t) => ({ ...t, colorMode: v })),
    setDarkMode: (v: boolean) => setTheme((t) => ({ ...t, darkMode: v })),
  };
  return (
    <div className="grid grid-cols-2 gap-y-1 gap-x-2">
      <div className="col-span-full">
        <button onClick={onBack} className="button w-full hover:bg-gray-200">
          ← 🎨 Theme
        </button>
      </div>

      <label htmlFor="font-select" className="flex justify-between items-center">
        Font
      </label>
      <select
        id="font-select"
        value={font}
        onChange={(e) => set.font(e.target.value)}
        className="w-full px-2 py-1 border border-gray-600 rounded-md bg-white text-black"
      >
        {fonts.map((f) => (
          <option key={f} value={f}>
            {titleCase(f)}
          </option>
        ))}
      </select>

      <Slider label="Size" value={fontSize} min={25} max={35} step={1} suffix="vw" onChange={set.fontSize} />
      <Slider label="Weight" value={fontWeight} min={100} max={900} step={100} onChange={set.fontWeight} />
      <Slider label="Hue" value={hue} min={0} max={360} step={1} suffix="°" onChange={set.hue} />

      <div className="col-span-full flex items-center">
        <input
          type="checkbox"
          id="darkmode-checkbox"
          checked={darkMode}
          onChange={(e) => set.setDarkMode(e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="darkmode-checkbox">Swap colours</label>
      </div>

      <label htmlFor="colormode-select" className="flex justify-between items-center">
        Color Mode
      </label>
      <select
        id="colormode-select"
        value={colorMode}
        onChange={(e) => set.colorMode(e.target.value)}
        className="w-full px-2 py-1 border border-gray-600 rounded-md bg-white text-black"
      >
        {colorModes.map((cm) => (
          <option key={cm} value={cm}>
            {titleCase(cm)}
          </option>
        ))}
      </select>

      {colorMode === 'daylight' && (
        <div className="col-span-full mt-2">
          <label className="flex justify-between items-center">
            Time of day (debug)
            <span>
              <input
                type="checkbox"
                className="mr-1"
                checked={timeOfDay !== null}
                onChange={(e) => setTimeOfDay(e.target.checked ? 12 : null)}
              />
              override
            </span>
          </label>
          {timeOfDay !== null && (
            <>
              <input
                type="range"
                min={0}
                max={24}
                step={0.25}
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(Number(e.target.value))}
                className="w-full"
              />
              <p className="col-span-full text-sm opacity-80">
                {formatHour(timeOfDay)} → {hourToHex(timeOfDay)}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
