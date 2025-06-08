import Alpine from 'alpinejs';

// , josefin-sans,
const fonts =
  'humanist,industrial,bebas-neue,serif,geometric,rounded,lobster,badeen,raleway,cherry-bomb-one,bangers,silkscreen,alfa-slab-one,rubik-mono-one,orbitron,mono-serif,didone,antique,old-style,transitional,system'.split(
    ',',
  );

const themes = fonts;
const colorModes = ['pastel', 'colourful', 'dark', 'B&W'];
const shufflePeriodOptions = '0,1,5,10,15,20,60'.split(',');
const shuffleStyleOptions = 'font,font & hue,font hue & color,hue,hue & color'.split(',');

Alpine.data('theme', () => ({
  theme: localStorage.getItem('theme') || themes[0],
  themes,
  fonts,
  fontSize: localStorage.getItem('fontSize') || 28,
  fontWeight: localStorage.getItem('fontWeight') || 700,
  hue: localStorage.getItem('hue') || 303,
  colorMode: localStorage.getItem('colorMode') || colorModes[0],
  colorModes,
  darkMode: localStorage.getItem('darkMode') === 'true',
  shufflePeriod: localStorage.getItem('shufflePeriod') || shufflePeriodOptions[0],
  shufflePeriodOptions,
  lastShuffle: null,
  shuffleStyle: localStorage.getItem('shuffleStyle') || shuffleStyleOptions[0],
  shuffleStyleOptions,
  init() {
    Alpine.effect(() => {
      localStorage.setItem('fontSize', this.fontSize);
      localStorage.setItem('fontWeight', this.fontWeight);
      localStorage.setItem('theme', this.theme);
      localStorage.setItem('hue', this.hue);
      localStorage.setItem('colorMode', this.colorMode);
      localStorage.setItem('darkMode', this.darkMode);
      localStorage.setItem('shufflePeriod', this.shufflePeriod);
      localStorage.setItem('shuffleStyle', this.shuffleStyle);
    });
  },
  showMenuSection(section) {
    if (this.shufflePeriod === '0') return true;
    return !this.shuffleStyle.includes(section);
  },
  onShuffle(m) {
    if (this.lastShuffle === null) {
      this.lastShuffle = m;
      return;
    }
    if (this.shufflePeriod == '0') return;
    const p = parseInt(this.shufflePeriod);
    if (isNaN(p)) return;
    if (m % p === 0 && this.lastShuffle !== m) {
      this.lastShuffle = m;
      this.shuffle();
    }
  },
  shuffle() {
    if (this.shuffleStyle.includes('hue')) {
      this.hue = Math.floor(Math.random() * 360);
    }
    if (this.shuffleStyle.includes('font')) {
      this.theme = this.themes[Math.floor(Math.random() * this.themes.length)];
    }
    if (this.shuffleStyle.includes('color')) {
      this.colorMode = this.colorModes[Math.floor(Math.random() * this.colorModes.length)];
      this.darkMode = Math.random() > 0.5;
    }
  },
  get colors() {
    const h = parseInt(this.hue);
    let bg, txt;

    if (this.colorMode === 'pastel') {
      bg = `hsl(${h}, 100%, 85%)`;
      txt = `hsl(${(h + 360 - 25) % 360}, 60%, 35%)`;
    } else if (this.colorMode === 'colourful') {
      bg = `hsl(${h}, 100%, 70%)`;
      txt = `hsl(${(h + 360 - 55) % 360}, 60%, 35%)`;
    } else if (this.colorMode === 'dark') {
      bg = `hsl(${h}, 100%, 7%)`;
      txt = `hsl(${h % 360}, 60%, 35%)`;
    } else {
      // B&W
      bg = `hsl(${h}, 0%, 95%)`;
      txt = `hsl(${h}, 0%, 10%)`;
    }

    if (this.darkMode) {
      return { bg: txt, text: bg };
    }
    return { bg, text: txt };
  },
}));
