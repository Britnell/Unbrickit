
// font keys map to .font-<key> classes in src/fonts.css
export const fonts =
  'humanist,industrial,bebas-neue,geometric,rounded,lobster,badeen,raleway,cherry-bomb-one,bangers,silkscreen,alfa-slab-one,rubik-mono-one,orbitron,mono-serif,didone,antique,system,pirata-one,rubik-bubbles,monoton,aldrich,rampart-one,kalnia,palette-mosaic,plaster,kenia,smokum,fascinate,zen-tokyo-zoo,bagel-fat-one,matemasie,sankofa-display,micro-5,mrs-sheppards,londrina-outline,kumar-one-outline'
    .split(',')
    .sort();

export const colorModes = ['pastel', 'colourful', 'dark', 'B&W'];

export function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function useLocalStorage<T>(key: string, initial: T) {
  const value = localStorage.getItem(key) ?? initial;
  return value as T;
}

export function colors(hue: number, colorMode: string, darkMode: boolean) {
  const h = Number(hue);
  let bg: string, txt: string;

  if (colorMode === 'pastel') {
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
