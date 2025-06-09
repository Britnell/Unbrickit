import Alpine from 'alpinejs';

Alpine.data('alarm', () => ({
  alarmTime: '07:00',
  isAlarmSet: false,
  isAlarmRinging: false,
  intervalId: null,
  lastTriggeredDate: null,

  init() {
    this.loadAlarmState();
    this.startTimeCheck();
  },

  loadAlarmState() {
    const saved = localStorage.getItem('alarm-state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        this.alarmTime = state.alarmTime || '07:00';
        this.isAlarmSet = state.isAlarmSet || false;
        this.lastTriggeredDate = state.lastTriggeredDate || null;
      } catch (e) {
        console.error('Failed to load alarm state:', e);
      }
    }
  },

  saveAlarmState() {
    const state = {
      alarmTime: this.alarmTime,
      isAlarmSet: this.isAlarmSet,
      lastTriggeredDate: this.lastTriggeredDate,
    };
    localStorage.setItem('alarm-state', JSON.stringify(state));
  },

  toggleAlarm() {
    this.isAlarmSet = !this.isAlarmSet;
    this.isAlarmRinging = false;
    this.saveAlarmState();
  },

  stopAlarm() {
    this.isAlarmRinging = false;

    this.saveAlarmState();
  },

  startTimeCheck() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.checkAlarmTime();
    this.intervalId = setInterval(() => {
      this.checkAlarmTime();
    }, 60000);
  },

  checkAlarmTime() {
    if (!this.isAlarmSet || this.isAlarmRinging) {
      return;
    }

    const now = new Date();
    const today = now.toDateString();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    if (this.lastTriggeredDate === today) {
      return;
    }

    const [alarmHours, alarmMinutes] = this.alarmTime.split(':').map(Number);

    const currentTimeInMinutes = currentHours * 60 + currentMinutes;
    const alarmTimeInMinutes = alarmHours * 60 + alarmMinutes;

    if (currentTimeInMinutes >= alarmTimeInMinutes) {
      this.triggerAlarm(today);
    }
  },

  triggerAlarm(date) {
    this.isAlarmRinging = true;
    this.lastTriggeredDate = date;
    this.saveAlarmState();

    const alarmEvent = new CustomEvent('alarmTriggered', {
      detail: {
        alarmTime: this.alarmTime,
        triggeredAt: new Date().toISOString(),
        date: date,
      },
    });
    document.dispatchEvent(alarmEvent);
  },

  resetForNextDay() {
    this.lastTriggeredDate = null;
    this.isAlarmRinging = false;
    this.saveAlarmState();
  },

  get hours() {
    return parseInt(this.alarmTime.split(':')[0]);
  },

  get minutes() {
    return parseInt(this.alarmTime.split(':')[1]);
  },

  incrementHours() {
    const newHours = (this.hours + 1) % 24;
    this.alarmTime = newHours.toString().padStart(2, '0') + ':' + this.minutes.toString().padStart(2, '0');
    this.saveAlarmState();
  },

  decrementHours() {
    const newHours = this.hours === 0 ? 23 : this.hours - 1;
    this.alarmTime = newHours.toString().padStart(2, '0') + ':' + this.minutes.toString().padStart(2, '0');
    this.saveAlarmState();
  },

  incrementMinutes() {
    const newMinutes = (this.minutes + 1) % 60;
    this.alarmTime = this.hours.toString().padStart(2, '0') + ':' + newMinutes.toString().padStart(2, '0');
    this.saveAlarmState();
  },

  decrementMinutes() {
    const newMinutes = this.minutes === 0 ? 59 : this.minutes - 1;
    this.alarmTime = this.hours.toString().padStart(2, '0') + ':' + newMinutes.toString().padStart(2, '0');
    this.saveAlarmState();
  },

  setHours(value) {
    const hours = parseInt(value);
    if (!isNaN(hours) && hours >= 0 && hours <= 23) {
      this.alarmTime = hours.toString().padStart(2, '0') + ':' + this.minutes.toString().padStart(2, '0');
      this.saveAlarmState();
    }
  },

  setMinutes(value) {
    const minutes = parseInt(value);
    if (!isNaN(minutes) && minutes >= 0 && minutes <= 59) {
      this.alarmTime = this.hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0');
      this.saveAlarmState();
    }
  },

  validateHours(input) {
    const value = parseInt(input.value);
    if (isNaN(value) || value < 0 || value > 23) {
      input.value = this.hours;
    } else {
      input.value = value.toString().padStart(2, '0');
      this.setHours(value);
    }
  },

  validateMinutes(input) {
    const value = parseInt(input.value);
    if (isNaN(value) || value < 0 || value > 59) {
      input.value = this.minutes;
    } else {
      input.value = value.toString().padStart(2, '0');
      this.setMinutes(value);
    }
  },

  get alarmStatus() {
    if (this.isAlarmRinging) return 'ringing';
    if (this.isAlarmSet) return 'set';
    return 'off';
  },

  get hasTriggeredToday() {
    const today = new Date().toDateString();
    return this.lastTriggeredDate === today;
  },
}));
