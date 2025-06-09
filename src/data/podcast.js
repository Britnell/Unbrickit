import Alpine from 'alpinejs';
import { getDesertIslandEpisode } from '../lib/podcast.ts';

Alpine.data('podcast', () => ({
  episodeAudio: '',
  episodeTitle: '',
  episodeUrl: '',
  playing: false,
  loading: false,
  error: null,
  audio: null,

  init() {
    // Load cached episode from localStorage

    this.episodeAudio = localStorage.getItem('podcastEpisodeAudio');
    this.episodeTitle = localStorage.getItem('podcastEpisodeTitle');
    this.episodeUrl = localStorage.getItem('podcastEpisodeUrl');

    // Watch for changes and save to localStorage
    Alpine.effect(() => {
      localStorage.setItem('podcastEpisodeAudio', this.episodeAudio);
      localStorage.setItem('podcastEpisodeTitle', this.episodeTitle);
      localStorage.setItem('podcastEpisodeUrl', this.episodeUrl);
    });
  },

  async loadRandomEpisode() {
    this.loading = true;
    this.error = null;

    const episodeData = await getDesertIslandEpisode();

    if (!episodeData?.audio) {
      this.error = 'Error - please try again';
      return;
    }

    this.episodeAudio = episodeData.audio;
    this.episodeTitle = episodeData.title;
    this.episodeUrl = episodeData.url;
    this.error = null;
    this.loading = false;
  },

  togglePlayback() {
    if (this.playing) {
      this.pauseEpisode();
    } else {
      this.playEpisode();
    }
  },

  async playEpisode() {
    if (!this.episodeAudio) return;

    try {
      // Stop current audio if playing
      if (this.audio) {
        this.audio.pause();
        this.audio = null;
      }

      this.audio = new Audio(this.episodeAudio);
      this.audio.preload = 'metadata';

      this.audio.addEventListener('loadstart', () => {
        this.loading = true;
      });

      this.audio.addEventListener('canplay', () => {
        this.loading = false;
      });

      this.audio.addEventListener('error', (e) => {
        this.loading = false;
        console.error('Audio error:', e);
        this.error = 'Error loading episode audio. Please try another episode.';
        this.playing = false;
      });

      this.audio.addEventListener('ended', () => {
        this.playing = false;
      });

      await this.audio.play();
      this.playing = true;
      this.error = null;
    } catch (error) {
      console.error('Playback error:', error);
      this.error = 'Failed to play episode. Please try again.';
      this.playing = false;
    }
  },

  pauseEpisode() {
    if (this.audio) {
      this.audio.pause();
      this.playing = false;
    }
  },

  // Cleanup when component is destroyed
  destroy() {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
  },
}));
