
// font keys map to .font-<key> classes in src/fonts.css
export const fonts =
  'humanist,industrial,bebas-neue,geometric,rounded,lobster,badeen,raleway,cherry-bomb-one,bangers,silkscreen,alfa-slab-one,rubik-mono-one,orbitron,mono-serif,didone,antique,system,pirata-one,rubik-bubbles,monoton,aldrich,rampart-one,kalnia,palette-mosaic,plaster,kenia,smokum,fascinate,zen-tokyo-zoo,bagel-fat-one,matemasie,sankofa-display,micro-5,mrs-sheppards,londrina-outline,kumar-one-outline'
    .split(',')
    .sort();

export const colorModes = ['pastel', 'colourful', 'dark', 'B&W', 'daylight'];

export function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function useLocalStorage<T>(key: string, initial: T) {
  const value = localStorage.getItem(key) ?? initial;
  return value as T;
}

// daylight mode: hour (0-24) -> color via anchor stops, interpolated in OKLab
// (perceptually smooth, no muddy greys; Kelvin/blackbody was abandoned - it
// can't produce saturated sky blue or deep red)
//
// ---- daylight mode: tweakable settings ----
//
// anchor COLORS for the day curve
const DAYLIGHT_COLORS = {
  nightDarkRed: '#2b0400', // near-black red, held overnight
  nightRed: '#c21800', // full red, reached at 9pm
  morningBlue: '#2f6fd0', // strong sky blue (6am jump, held to 7am)
  tealBlue: '#1e9bc8', // brighter teal blue, morning fades towards this
  coolWhite: '#dbe9ff', // blue faded out by this point
  neutralWhite: '#fff6ec', // reached at 1pm
  warmWhite: '#ffe9c8', // warm white, reached by 4pm
  warmerWhite: '#ffd8a0', // even warmer white, before orange
  orange: '#ff9a3c', // sunset fade starts from here
};

// anchor TIMES (decimal hours) for the day curve
const DAYLIGHT_TIMES = {
  dawnBlue: 6, // 6am: jump from night color to blue
  blueHoldUntil: 7, // 7am: start fading blue -> teal
  tealAt: 9, // morning blue faded to teal blue by here
  tealHoldUntil: 10, // hold teal, then slowly fade towards white
  neutralWhiteAt: 13, // 1pm: neutral white
  warmWhiteAt: 16, // 4pm: warm white (slow fade through whites during the day)
  warmerWhiteAt: 17, // 5pm: even warmer white, before orange
  orangeAt: 19.5, // 7:30pm: warm white -> orange -> red fade starts
  redAt: 21, // 9pm: full red
  darkRedAt: 22, // 10pm: red faded to near-black, held until dawn
};

const daylightAnchors: [number, string][] = [
  [0, DAYLIGHT_COLORS.nightDarkRed], // night
  [DAYLIGHT_TIMES.dawnBlue, DAYLIGHT_COLORS.nightDarkRed], // still night
  [DAYLIGHT_TIMES.dawnBlue + 0.001, DAYLIGHT_COLORS.morningBlue], // 6am: jump to blue
  [DAYLIGHT_TIMES.blueHoldUntil, DAYLIGHT_COLORS.morningBlue], // hold blue
  [DAYLIGHT_TIMES.tealAt, DAYLIGHT_COLORS.tealBlue], // fade blue -> teal blue
  [DAYLIGHT_TIMES.tealHoldUntil, DAYLIGHT_COLORS.tealBlue], // hold teal
  [DAYLIGHT_TIMES.neutralWhiteAt, DAYLIGHT_COLORS.neutralWhite], // 1pm: neutral white
  [DAYLIGHT_TIMES.warmWhiteAt, DAYLIGHT_COLORS.warmWhite], // 4pm: warm white
  [DAYLIGHT_TIMES.warmerWhiteAt, DAYLIGHT_COLORS.warmerWhite], // 5pm: warmer white
  [DAYLIGHT_TIMES.orangeAt, DAYLIGHT_COLORS.orange], // orange
  [DAYLIGHT_TIMES.redAt, DAYLIGHT_COLORS.nightRed], // 9pm: full red
  [DAYLIGHT_TIMES.darkRedAt, DAYLIGHT_COLORS.nightDarkRed], // 10pm: near-black red
  [24, DAYLIGHT_COLORS.nightDarkRed], // hold dark red
];

// text/digit colors: black during the day, fades to red overnight in step
// with the background fading to black (so digits stay readable at night)
const daylightTextAnchors: [number, string][] = [
  [0, DAYLIGHT_COLORS.nightRed], // night: red text on near-black bg
  [DAYLIGHT_TIMES.dawnBlue, DAYLIGHT_COLORS.nightRed], // still red until 6am
  [DAYLIGHT_TIMES.dawnBlue + 0.001, '#000000'], // 6am: jump to black text
  [DAYLIGHT_TIMES.redAt, '#000000'], // 9pm: still black text
  [DAYLIGHT_TIMES.darkRedAt, DAYLIGHT_COLORS.nightRed], // 10pm: red text
  [24, DAYLIGHT_COLORS.nightRed],
];

// sRGB hex -> OKLab and back (Björn Ottosson's reference implementation)
function hexToOklab(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const f = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lr = f(r), lg = f(g), lb = f(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToHex(L: number, a: number, b: number): string {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const chans = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return (
    '#' +
    chans
      .map((c) =>
        Math.round(
          Math.min(255, Math.max(0, (c > 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c) * 255)),
        )
        .toString(16)
        .padStart(2, '0')
      )
      .join('')
  );
}

function interpolateAnchors(anchors: [number, string][], hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const labs = anchors.map(([t, c]) => [t, hexToOklab(c)] as [number, [number, number, number]]);
  for (let i = 0; i < labs.length - 1; i++) {
    const [t0, c0] = labs[i];
    const [t1, c1] = labs[i + 1];
    if (h >= t0 && h <= t1) {
      const t = (h - t0) / (t1 - t0);
      const mix: [number, number, number] = [0, 1, 2].map((j) => c0[j] + t * (c1[j] - c0[j])) as [number, number, number];
      return oklabToHex(mix[0], mix[1], mix[2]);
    }
  }
  return anchors[0][1];
}

export function hourToHex(hour: number): string {
  return interpolateAnchors(daylightAnchors, hour);
}

export function hourToTextHex(hour: number): string {
  return interpolateAnchors(daylightTextAnchors, hour);
}

export function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(mm === 60 ? (hh + 1) % 24 : hh).padStart(2, '0')}:${String(mm === 60 ? 0 : mm).padStart(2, '0')}`;
}

export function colors(hue: number, colorMode: string, darkMode: boolean, timeOfDay?: number | null) {
  const h = Number(hue);
  let bg: string, txt: string;

  if (colorMode === 'daylight') {
    const hour = timeOfDay ?? new Date().getHours() + new Date().getMinutes() / 60;
    bg = hourToHex(hour);
    txt = hourToTextHex(hour);
  } else if (colorMode === 'pastel') {
    bg = `hsl(${h}, 100%, 85%)`;
    txt = `hsl(${(h + 360 - 25) % 360}, 60%, 35%)`;
  } else if (colorMode === 'colourful') {
    bg = `hsl(${h}, 100%, 70%)`;
    txt = `hsl(${(h + 360 - 55) % 360}, 60%, 35%)`;
  } else if (colorMode === 'dark') {
    bg = `hsl(${h}, 100%, 7%)`;
    txt = `hsl(${h % 360}, 60%, 35%)`;
  } else {
    // B&W
    bg = `hsl(${h}, 0%, 95%)`;
    txt = `hsl(${h}, 0%, 10%)`;
  }

  return darkMode ? { bg: txt, text: bg } : { bg, text: txt };
}
