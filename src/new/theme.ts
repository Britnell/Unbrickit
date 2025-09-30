import { computed } from '@preact/signals-core';
import way from './framework';

way.store('theme', () => {
  const size = way.signal('28');
  const weight = way.signal(500);
  const hue = way.signal('30');

  const bg = computed(() => {
    return `hsl(${hue.value}, 100%, 70%)`;
  });
  const text = computed(() => {
    const h = (parseInt(hue.value) + 360 + 30) % 360;
    return `hsl(${h}, 60%, 35%)`;
  });

  return {
    size,
    weight,
    hue,
    bg,
    text,
  };
});
