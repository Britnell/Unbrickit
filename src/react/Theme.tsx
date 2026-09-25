import { colorModes, fonts, titleCase } from './state';

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

export default function Theme({
  font,
  setFont,
  fontSize,
  setFontSize,
  fontWeight,
  setFontWeight,
  hue,
  setHue,
  colorMode,
  setColorMode,
  darkMode,
  setDarkMode,
  onBack,
}: {
  font: string;
  setFont: (f: string) => void;
  fontSize: number;
  setFontSize: (v: number) => void;
  fontWeight: number;
  setFontWeight: (v: number) => void;
  hue: number;
  setHue: (v: number) => void;
  colorMode: string;
  setColorMode: (v: string) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  onBack: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-y-1 gap-x-2">
      <div className="col-span-full">
        <button onClick={onBack} className="px-2 py-1 hover:bg-gray-200">
          ← 🎨 Theme
        </button>
      </div>

      <label htmlFor="font-select" className="flex justify-between items-center">
        Font
      </label>
      <select
        id="font-select"
        value={font}
        onChange={(e) => setFont(e.target.value)}
        className="w-full px-2 py-1 border border-gray-600 rounded-md bg-white text-black"
      >
        {fonts.map((f) => (
          <option key={f} value={f}>
            {titleCase(f)}
          </option>
        ))}
      </select>

      <Slider label="Size" value={fontSize} min={25} max={35} step={1} suffix="vw" onChange={setFontSize} />
      <Slider label="Weight" value={fontWeight} min={100} max={900} step={100} onChange={setFontWeight} />
      <Slider label="Hue" value={hue} min={0} max={360} step={1} suffix="°" onChange={setHue} />

      <div className="col-span-full flex items-center">
        <input
          type="checkbox"
          id="darkmode-checkbox"
          checked={darkMode}
          onChange={(e) => setDarkMode(e.target.checked)}
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
        onChange={(e) => setColorMode(e.target.value)}
        className="w-full px-2 py-1 border border-gray-600 rounded-md bg-white text-black"
      >
        {colorModes.map((cm) => (
          <option key={cm} value={cm}>
            {titleCase(cm)}
          </option>
        ))}
      </select>
    </div>
  );
}
