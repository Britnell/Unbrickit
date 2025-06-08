import Alpine from 'alpinejs';
import { playTimerBeep } from '../lib/tone.ts';

Alpine.data('timer', () => ({
  duration: 5 * 60 * 1000,
  startTime: null,
  remainingTime: 0,
  intervalId: null,
  // hasCompleted: false,

  init() {
    this.loadTimerState();

    if (this.startTime) {
      this.startUpdateInterval();
    }
  },

  loadTimerState() {
    const saved = localStorage.getItem('timer-state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        this.duration = state.duration || 5 * 60 * 1000;
        this.startTime = state.startTime || null;

        if (this.startTime) {
          this.updateRemainingTime();
        }
      } catch (e) {
        console.error('Failed to load timer state:', e);
      }
    }
  },

  saveTimerState() {
    const state = {
      duration: this.duration,
      startTime: this.startTime,
    };
    localStorage.setItem('timer-state', JSON.stringify(state));
  },

  toggleTimer() {
    playTimerBeep();
    if (this.isRunning) {
      this.stopTimer();
    } else {
      this.startTimer();
    }
  },

  startTimer() {
    if (this.duration === 0) {
      return;
    }

    this.startTime = Date.now();
    // this.hasCompleted = false; // Reset completion flag when starting
    this.startUpdateInterval();
    this.saveTimerState();
  },

  stopTimer() {
    this.startTime = null;
    this.remainingTime = 0;
    // this.hasCompleted = false; // Reset completion flag when stopping

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.saveTimerState();
  },

  startUpdateInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.updateRemainingTime();
    this.intervalId = setInterval(() => {
      this.updateRemainingTime();
    }, 1000);
  },

  updateRemainingTime() {
    if (!this.startTime) {
      return;
    }

    const elapsed = Date.now() - this.startTime;
    this.remainingTime = this.duration - elapsed;

    const reachedZero = Math.floor(this.remainingTime / 1000) === 0;

    if (reachedZero) {
      const timerCompleteEvent = new CustomEvent('timerComplete', {
        detail: {
          duration: this.duration,
          completedAt: new Date().toISOString(),
        },
      });
      document.dispatchEvent(timerCompleteEvent);
      playTimerBeep();
    }
  },

  get isRunning() {
    return this.startTime !== null;
  },

  get hours() {
    return Math.floor(this.duration / (60 * 60 * 1000));
  },

  get minutes() {
    return Math.floor((this.duration % (60 * 60 * 1000)) / (60 * 1000));
  },

  get displayTime() {
    if (!this.isRunning) {
      return this.formatTime(this.hours, this.minutes, 0);
    }

    const totalSeconds = Math.floor(Math.abs(this.remainingTime) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const sign = this.remainingTime < 0 ? '-' : '';
    return sign + this.formatTime(hours, minutes, seconds);
  },

  formatTime(hours, minutes, seconds) {
    if (hours === 0) {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  },

  incrementHours() {
    if (!this.isRunning) {
      this.duration += 60 * 60 * 1000;
      this.saveTimerState();
    }
  },

  decrementHours() {
    if (!this.isRunning && this.hours > 0) {
      this.duration -= 60 * 60 * 1000;
      this.saveTimerState();
    }
  },

  incrementMinutes() {
    if (!this.isRunning) {
      this.duration += 60 * 1000;
      this.saveTimerState();
    }
  },

  decrementMinutes() {
    if (!this.isRunning && this.minutes > 0) {
      this.duration -= 60 * 1000;
      this.saveTimerState();
    }
  },

  get timerStatus() {
    return this.isRunning ? 'running' : 'stopped';
  },
}));
