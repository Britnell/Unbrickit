import { defineStore } from 'pinia';
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';

const fonts =
  'system,humanist,industrial,serif,geometric,rounded,mono-serif,didone,antique,old-style,transitional'.split(',');
const svgs = 'janis'.split(',');
const themes = [...fonts, ...svgs];

const shufflePeriodOptions = '0,1,5,10,15,20,60'.split(',');
const intervalOptions = ['0', '1', '5', '15', '60'];
const colorModes = ['pastel', 'colourful', 'dark', 'B&W'];
const chimeOptions = ['chime', 'speak'];

export type Time = {
  h: number;
  m: number;
  s: number;
  string: string;
};

export const useClockStore = defineStore('clock', () => {
  const time = ref<Time | null>(null);
  const clockInterval = ref<NodeJS.Timeout | null>(null);
  const theme = ref(themes[0]);
  const fontSize = ref(26);
  const weight = ref(800);
  const hue = ref(60);
  const colorMode = ref(colorModes[0]);
  const darkMode = ref(localStorage.getItem('darkMode') === 'true' || false);

  onMounted(() => {
    start();
  });

  function start() {
    updateTime();

    const t = new Date();
    const nextSecond = 1000 - t.getMilliseconds();

    setTimeout(() => {
      updateTime();
      clockInterval.value = setInterval(loop, 1000);
    }, nextSecond);
  }

  function loop() {
    updateTime();
  }

  function updateTime() {
    const [h, m, s] = getTime();
    time.value = {
      h,
      m,
      s,
      string: formatTime(h, m, s),
    };
  }

  // Watch for dark mode changes and save to localStorage
  watch(darkMode, (newVal) => {
    localStorage.setItem('darkMode', String(newVal));
  });

  return {
    time,
    theme,
    fontSize,
    weight,
    hue,
    colorMode,
    darkMode,
    themes,
    fonts,
    svgs,
    shufflePeriodOptions,
    intervalOptions,
    colorModes,
    chimeOptions,
  };
});

function pastelColors(h: number) {
  const a = `hsl(${h}, 100%, 85%)`;
  const b = `hsl(${(h + 360 - 25) % 360}, 60%, 35%)`;
  return [a, b];
}

function colourful(h: number) {
  const a = `hsl(${h}, 100%, 70%)`;
  const b = `hsl(${(h + 360 - 55) % 360}, 60%, 35%)`;
  return [a, b];
}

function getTime() {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  return [h, m, s];
}

function formatTime(h: number, m: number, s: number, format: 'hm' | 'hms' = 'hm'): string {
  const _h = String(h).padStart(2, '0');
  const _m = String(m).padStart(2, '0');
  const _s = String(s).padStart(2, '0');
  if (format === 'hms') {
    return `${_h}:${_m}:${_s}`;
  }
  return `${_h}:${_m}`;
}
