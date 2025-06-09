import Alpine from 'alpinejs';
import { randomChord } from '../lib/tone.ts';
import { speak } from '../lib/speech.ts';

const alarmText = [
  'alarm beep beep beep beep',
  'your time is up',
  'bleep bloop bleep bloop bleep',
  'what you gonna do about it',
];

Alpine.data('alarm', () => ({
  alarmHours: 7,
  alarmMinutes: 0,
  alarmType: 'chime',
  alarmOptions: ['chime', 'speak'],
  isAlarmSet: false,
  isAlarmRinging: false,
  alarmInterval: null,
  intervalId: null,
  lastTriggeredDate: null,
  init() {
    this.loadAlarmState();
    this.startTimeCheck();

    Alpine.effect(() => {
      const hr = parseInt(this.alarmHours);
      if (isNaN(hr)) {
        this.alarmHours = 12;
      } else if (hr < 0) {
        this.alarmHours = 0;
      } else if (hr > 23) {
        this.alarmHours = 23;
      } else {
        this.alarmHours = hr;
      }
    });

    Alpine.effect(() => {
      let min = parseInt(this.alarmMinutes);
      if (isNaN(min)) {
        this.alarmMinutes = 12;
      } else if (min < 0) {
        this.alarmMinutes = 0;
      } else if (min > 59) {
        this.alarmMinutes = 59;
      } else {
        this.alarmMinutes = min;
      }
      this.saveAlarmState();
    });
  },

  loadAlarmState() {
    try {
      const saved = localStorage.getItem('alarm-state');
      const state = JSON.parse(saved);
      this.alarmHours = state.alarmHours || 7;
      this.alarmMinutes = state.alarmMinutes || 0;
      this.alarmType = state.alarmType || 'chime';
      this.isAlarmSet = state.isAlarmSet || false;
      this.lastTriggeredDate = state.lastTriggeredDate || null;
    } catch {
      //
    }
  },

  saveAlarmState() {
    const state = {
      alarmHours: this.alarmHours,
      alarmMinutes: this.alarmMinutes,
      alarmType: this.alarmType,
      isAlarmSet: this.isAlarmSet,
      lastTriggeredDate: this.lastTriggeredDate,
    };
    localStorage.setItem('alarm-state', JSON.stringify(state));
  },

  toggleAlarm() {
    this.isAlarmSet = !this.isAlarmSet;
    this.lastTriggeredDate = null;
    this.saveAlarmState();
  },

  stopAlarm() {
    this.isAlarmRinging = false;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  },

  startTimeCheck() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.checkAlarmTime();

    const now = new Date();
    const nextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    setTimeout(() => {
      this.checkAlarmTime();

      this.intervalId = setInterval(() => {
        this.checkAlarmTime();
      }, 60000);
    }, nextMinute);
  },

  checkAlarmTime() {
    if (!this.isAlarmSet || this.isAlarmRinging) {
      return;
    }

    const now = new Date();
    const today = now.toDateString();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    const currentTimeInMinutes = currentHours * 60 + currentMinutes;
    const alarmTimeInMinutes = this.alarmHours * 60 + this.alarmMinutes;

    if (currentTimeInMinutes >= alarmTimeInMinutes) {
      this.triggerAlarm(today);
    }
  },

  triggerAlarm(date) {
    if (this.lastTriggeredDate === date) {
      return;
    }

    this.isAlarmRinging = true;
    this.lastTriggeredDate = date;
    this.saveAlarmState();

    let x = 0;

    const bleep = () => {
      if (this.alarmType === 'chime') {
        randomChord();
      }
      if (this.alarmType === 'speak') {
        speak(alarmText[x++ % alarmText.length]);
      }
      //
    };

    bleep();
    this.alarmInterval = setInterval(bleep, 5000);
    this.$dispatch('alarm');
  },

  get alarmTimeString() {
    return this.alarmHours.toString().padStart(2, '0') + ':' + this.alarmMinutes.toString().padStart(2, '0');
  },
}));
