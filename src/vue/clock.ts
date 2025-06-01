import { defineStore } from 'pinia';
import { computed, ref, onMounted } from 'vue';
import { cachedRef } from '../utils/cachedRef';
import { playChime } from '../utils/notes';
import { speakTime } from '../utils/speech';

type Colors = {
  bgColor: string;
  textColor: string;
};

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
  //
  const theme = cachedRef('theme', themes[0]);
  const fontSize = cachedRef('fontSize', 26);
  const weight = cachedRef('weight', 800);
  const hue = cachedRef('hue', 60);
  const colorMode = cachedRef('colorMode', colorModes[0]);
  const darkMode = ref(localStorage.getItem('darkMode') === 'true' || false);
  const shufflePeriod = cachedRef('shufflePeriod', shufflePeriodOptions[0]);

  // Chime properties
  const chimeInterval = cachedRef('chimeInterval', intervalOptions[0]);
  const chime = cachedRef('chime', chimeOptions[0]);
  const voice = cachedRef('voice', 'Daniel (English (United Kingdom))');

  // Shuffle tracking
  const shuffleLast = ref<number | null>(null);
  const lastChime = ref<number | null>(null);

  onMounted(() => {
    start();
    // todo event listener for window focus
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
    if (time.value) {
      shuffleLoop(time.value.m);
      chimeLoop(time.value.m);
    }
  }

  function shuffleLoop(m: number) {
    if (String(shufflePeriod.value) !== '0') {
      const period = parseInt(String(shufflePeriod.value));
      const t = Math.floor(m / period);
      if (shuffleLast.value === null) {
        shuffleLast.value = t;
        return;
      }
      if (t !== shuffleLast.value) {
        shuffleLast.value = t;
        shuffle();
      }
    }
  }

  function chimeLoop(min: number) {
    if (chimeInterval.value === '0') return;

    // dont chime on pageload
    if (lastChime.value === null) {
      lastChime.value = min;
      return;
    }

    const interval = parseInt(chimeInterval.value);

    if (min === 0 || min % interval === 0) {
      if (min !== lastChime.value) {
        chimeTime();
        lastChime.value = min;
      }
    }
  }

  function shuffle() {
    const th = Math.floor(Math.random() * themes.length);
    theme.value = themes[th];
    hue.value = Math.floor(Math.random() * 360);
    weight.value = Math.round((Math.random() * 8 + 1) * 100);
  }

  function chimeTime() {
    if (!time.value) return;

    if (chime.value === 'chime') {
      return playChime();
    }
    if (chime.value === 'speak') {
      return speakTime(time.value.h, time.value.m, String(voice.value));
    }
  }

  function updateTime() {
    const [h, m, s] = getTime();
    time.value = { h, m, s, string: formatTime(h, m, s) };
  }

  const colors = computed<Colors>(() => {
    const h = hue.value;
    let bgColor, textColor;

    if (colorMode.value === 'pastel') {
      bgColor = `hsl(${h}, 100%, 85%)`;
      textColor = `hsl(${(h + 360 - 25) % 360}, 60%, 35%)`;
    } else if (colorMode.value === 'colourful') {
      bgColor = `hsl(${h}, 100%, 70%)`;
      textColor = `hsl(${(h + 360 - 55) % 360}, 60%, 35%)`;
    } else if (colorMode.value === 'dark') {
      bgColor = `hsl(${h}, 100%, 7%)`;
      textColor = `hsl(${h % 360}, 60%, 35%)`;
    } else {
      // B&W
      bgColor = `hsl(${h}, 0%, 95%)`;
      textColor = `hsl(${h}, 0%, 10%)`;
    }

    if (darkMode.value) {
      [bgColor, textColor] = [textColor, bgColor];
    }

    return { bgColor, textColor };
  });

  return {
    time,
    theme,
    fontSize,
    weight,
    hue,
    colorMode,
    darkMode,
    shufflePeriod,
    chimeInterval,
    chime,
    voice,
    colors,
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
