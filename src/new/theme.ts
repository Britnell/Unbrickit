import { computed, effect } from '@preact/signals-core';
import way from './framework';

const fonts =
  'humanist,industrial,bebas-neue,geometric,rounded,lobster,badeen,raleway,cherry-bomb-one,bangers,silkscreen,alfa-slab-one,rubik-mono-one,orbitron,mono-serif,didone,antique,system,pirata-one,rubik-bubbles,monoton,aldrich,rampart-one,kalnia,palette-mosaic,plaster,kenia,smokum,fascinate,zen-tokyo-zoo,bagel-fat-one,matemasie,sankofa-display,micro-5,mrs-sheppards,londrina-outline,kumar-one-outline'
    .split(',')
    .sort((a, b) => (a > b ? 1 : -1));
const colormodes = ['pastel', 'colourful', 'dark', 'B&W'];

way.store('theme', () => {
  const size = way.signal('28');
  const weight = way.signal(500);
  const hue = way.signal('30');
  const font = way.signal(fonts[5]);
  const colormode = way.signal(colormodes[0]);

  const bg = way.signal('');
  const text = way.signal('');
  const invert = way.signal(true);

  way.effect(() => {
    const cm = colormode.value;
    const h = parseInt(hue.value);

    if (cm === 'pastel') {
      bg.value = `hsl(${h}, 100%, 85%)`;
      text.value = `hsl(${(h + 360 - 25) % 360}, 60%, 35%)`;
    } else if (cm === 'colourful') {
      bg.value = `hsl(${h}, 100%, 70%)`;
      text.value = `hsl(${(h + 360 - 55) % 360}, 60%, 35%)`;
    } else if (cm === 'dark') {
      bg.value = `hsl(${h}, 100%, 7%)`;
      text.value = `hsl(${h % 360}, 60%, 35%)`;
    } else {
      // B&W
      bg.value = `hsl(${h}, 0%, 95%)`;
      text.value = `hsl(${h}, 0%, 10%)`;
    }
  });

  return {
    size,
    weight,
    font,
    fonts,
    hue,
    text,
    bg,
    colormode,
    colormodes,
    invert,
  };
});
