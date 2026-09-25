import { fonts, titleCase } from './state';

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
  onBack,
}: {
  font: string;
  setFont: (f: string) => void;
  fontSize: number;
  setFontSize: (v: number) => void;
  fontWeight: number;
  setFontWeight: (v: number) => void;
  onBack: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-y-1 gap-x-2">
      <div className="col-span-full">
        <button onClick={onBack} className="px-2 py-1 hover:bg-[#fff5]">
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
        className="w-full px-2 py-1 border border-gray-600 rounded-md bg-transparent"
      >
        {fonts.map((f) => (
          <option key={f} value={f}>
            {titleCase(f)}
          </option>
        ))}
      </select>

      <Slider label="Size" value={fontSize} min={25} max={35} step={1} suffix="vw" onChange={setFontSize} />
      <Slider label="Weight" value={fontWeight} min={100} max={900} step={100} onChange={setFontWeight} />
    </div>
  );
}
