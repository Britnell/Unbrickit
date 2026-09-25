
// font keys map to .font-<key> classes in src/fonts.css
export const fonts =
  'humanist,industrial,bebas-neue,geometric,rounded,lobster,badeen,raleway,cherry-bomb-one,bangers,silkscreen,alfa-slab-one,rubik-mono-one,orbitron,mono-serif,didone,antique,system,pirata-one,rubik-bubbles,monoton,aldrich,rampart-one,kalnia,palette-mosaic,plaster,kenia,smokum,fascinate,zen-tokyo-zoo,bagel-fat-one,matemasie,sankofa-display,micro-5,mrs-sheppards,londrina-outline,kumar-one-outline'
    .split(',')
    .sort();

export function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function useLocalStorage<T>(key: string, initial: T) {
  const value = localStorage.getItem(key) ?? initial;
  return value as T;
}
