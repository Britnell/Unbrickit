import Alpine from 'alpinejs';
import { getDesertIslandEpisode } from '../lib/podcast.ts';

Alpine.data('podcast', () => ({
  episodeAudio: '',
  episodeTitle: '',
  episodeUrl: '',
  playingPodcast: false,
  loading: false,
  error: null,
  audio: null,
  lastPlaybackPosition: 0,

  init() {
    // Load cached episode from localStorage
    this.episodeAudio = localStorage.getItem('podcastEpisodeAudio');
    this.episodeTitle = localStorage.getItem('podcastEpisodeTitle');
    this.episodeUrl = localStorage.getItem('podcastEpisodeUrl');
    this.lastPlaybackPosition = Number(localStorage.getItem('lastPlaybackPosition')) || 0;

    // Watch for changes and save to localStorage
    Alpine.effect(() => {
      localStorage.setItem('podcastEpisodeAudio', this.episodeAudio);
      localStorage.setItem('podcastEpisodeTitle', this.episodeTitle);
      localStorage.setItem('podcastEpisodeUrl', this.episodeUrl);
      localStorage.setItem('lastPlaybackPosition', this.lastPlaybackPosition);
    });
  },

  async loadRandomEpisode() {
    this.loading = true;
    this.error = null;
    this.lastPlaybackPosition = 0;

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
    if (this.playingPodcast) {
      this.pauseEpisode();
    } else {
      this.playEpisode();
    }
  },

  async playEpisode() {
    if (!this.episodeAudio) return;

    try {
      // Only create new audio if we don't have one or if the source changed
      if (!this.audio || this.audio.src !== this.episodeAudio) {
        // Clean up existing audio if it exists
        if (this.audio) {
          this.audio.pause();
          this.audio = null;
        }

        this.audio = new Audio(this.episodeAudio);
        this.audio.preload = 'metadata';

        this.audio.addEventListener('loadedmetadata', () => {
          if (this.lastPlaybackPosition) {
            this.audio.currentTime = this.lastPlaybackPosition;
          }
        });

        this.audio.addEventListener('timeupdate', () => {
          if (!this.lastPlaybackPosition) {
            this.lastPlaybackPosition = this.audio.currentTime;
            return;
          }
          if (this.audio.currentTime - this.lastPlaybackPosition >= 2) {
            this.lastPlaybackPosition = this.audio.currentTime;
          }
        });

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
          this.playingPodcast = false;
          this.lastPlaybackPosition = 0;
        });

        this.audio.addEventListener('ended', () => {
          this.playingPodcast = false;
          this.lastPlaybackPosition = 0;
        });
      }

      await this.audio.play();
      this.playingPodcast = true;
      this.error = null;
    } catch (error) {
      console.error('Playback error:', error);
      this.error = 'Failed to play episode. Please try again.';
      this.playingPodcast = false;
    }
  },

  pauseEpisode() {
    if (this.audio) {
      this.audio.pause();
      this.playingPodcast = false;
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
