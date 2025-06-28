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
  playingRadio: false,
  loading: false,
  radio: null,
  init() {
    this.selectedStation = localStorage.getItem('selectedStation') || Object.keys(this.stations)[0];

    Alpine.effect(() => {
      localStorage.setItem('selectedStation', this.selectedStation);
    });
  },

  toggleRadio() {
    if (this.playingRadio) {
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

      if (!this.radio || this.radio.src !== url) {
        if (this.radio) {
          this.radio.pause();
          this.radio = null;
        }

        this.radio = new Audio(url);
        this.radio.preload = 'none';

        this.radio.addEventListener('loadstart', () => {
          this.loading = true;
        });

        this.radio.addEventListener('canplay', () => {
          this.loading = false;
        });

        this.radio.addEventListener('error', (e) => {
          this.loading = false;
          console.error('radio error:', e);
          this.error = ' Error loading radio station, try another one or try again';
        });

        this.radio.addEventListener('ended', () => {
          this.playingRadio = false;
        });
      }

      await this.radio.play();
      this.playingRadio = true;
      this.loading = false;
      this.error = '';
      this.playingStation = this.selectedStation;
    } catch (error) {
      this.loading = false;
      this.playingRadio = false;
      this.error = 'Failed to play radio stream. Please try another station.';
    }
  },

  stopRadio() {
    if (this.radio) {
      this.radio.pause();
      this.playingRadio = false;
    }
  },
}));
