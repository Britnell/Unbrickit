import Alpine from 'alpinejs';
import { playChime, randomChord } from '../lib/tone';
import { speakTime, buzzz } from '../lib/speech';

const chimeTypes = ['jazzy', 'speak', 'chime', 'vibrate'];
const chimeIntervalOptions = '0,1,5,15,20,30,60'.split(',');

Alpine.data('chime', () => ({
  chimeType: localStorage.getItem('chimeType') || chimeTypes[0],
  chimeTypes,
  chimeInterval: localStorage.getItem('chimeInterval') || chimeIntervalOptions[0],
  chimeIntervalOptions,
  lastChime: null,
  voice: localStorage.getItem('voice') || null,
  voices: [],
  init() {
    this.initVoices();

    Alpine.effect(() => {
      localStorage.setItem('chimeType', this.chimeType);
      localStorage.setItem('chimeInterval', this.chimeInterval);
      localStorage.setItem('voice', this.voice);
    });
  },
  initVoices() {
    const voices = speechSynthesis.getVoices();
    if (voices.length) {
      this.voices = voices;
      return;
    }

    const onVoicesChanged = () => {
      this.initVoices();
      speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
    };
    speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);

    return this.voices;
  },
  onChime(h, m) {
    if (this.lastChime == null) {
      this.lastChime = m;
      return;
    }
    if (this.chimeInterval === '0') return;
    if (this.lastChime === m) return;
    const p = parseInt(this.chimeInterval);
    if (isNaN(p)) return;
    if (m % p === 0) {
      this.lastChime = m;
      if (this.chimeType === 'chime') {
        playChime();
      }
      if (this.chimeType === 'speak') {
        speakTime(h, m, this.voice);
      }
      if (this.chimeType === 'jazzy') {
        randomChord();
      }
      if (this.chimeType === 'vibrate') {
        buzzz([200, 200, 100]);
      }
    }
  },
}));
