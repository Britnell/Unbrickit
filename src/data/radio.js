import Alpine from 'alpinejs';

const stations = {
  NTS: 'http://stream-relay-geo.ntslive.net/stream',
  'Worldwide FM': 'http://worldwidefm.out.airtime.pro:8000/worldwidefm_a',
  'KEXP Seattle': 'https://kexp.streamguys1.com/kexp160.aac',
  'KEXP 128': 'http://live-mp3-128.kexp.org/kexp128.mp3',
  FM4: 'https://orf-live.ors-shoutcast.at/fm4-q1a',
  // 'Fm4 v2': 'https://orf-live.ors-shoutcast.at/fm4-q2a',
  NPR: 'https://npr-ice.streamguys1.com/live.mp3',
};

Alpine.data('radio', () => ({
  stations,
  selectedStation: '',
  playingStation: '',
  error: null,
  playing: false,
  loading: false,
  audio: null,
  init() {
    this.selectedStation = localStorage.getItem('selectedStation') || Object.keys(this.stations)[0];

    Alpine.effect(() => {
      localStorage.setItem('selectedStation', this.selectedStation);
    });
  },

  toggleRadio() {
    if (this.playing) {
      this.stopRadio();
    } else {
      this.playRadio();
    }
  },

  async playRadio() {
    const url = this.stations[this.selectedStation];
    if (!url) return;

    try {
      this.loading = true;

      if (!this.audio || this.audio.src !== url) {
        if (this.audio) {
          this.audio.pause();
          this.audio = null;
        }

        this.audio = new Audio(url);
        this.audio.preload = 'none';

        this.audio.addEventListener('loadstart', () => {
          this.loading = true;
        });

        this.audio.addEventListener('canplay', () => {
          this.loading = false;
        });

        this.audio.addEventListener('error', (e) => {
          this.loading = false;
          console.error('Audio error:', e);
          this.error = ' Error loading radio station, try another one or try again';
        });

        this.audio.addEventListener('ended', () => {
          this.playing = false;
        });
      }

      await this.audio.play();
      this.playing = true;
      this.loading = false;
      this.error = '';
      this.playingStation = this.selectedStation;
    } catch (error) {
      this.loading = false;
      this.playing = false;
      this.error = 'Failed to play radio stream. Please try another station.';
    }
  },

  stopRadio() {
    if (this.audio) {
      this.audio.pause();
      this.playing = false;
    }
  },
}));
