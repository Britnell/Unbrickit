import Alpine from 'alpinejs';
import { getLastTwoWeeksDates, getWeekday, safeParse, datestr } from '../helper';
import { initializeDB, getHabitLogsForDateRange, upsertHabitLog } from '../db';

Alpine.data('habit', () => ({
  habits: safeParse('habits') || {},
  showHabitApp: 'showHabitApp' || false,
  editHabit: '',
  habitData: [],
  openHabit: null,
  async init() {
    try {
      await initializeDB();
      await this.loadHabitData();
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }

    Alpine.effect(() => {
      localStorage.setItem('habits', JSON.stringify(this.habits));
      localStorage.setItem('showHabitApp', this.showHabitApp);
    });
  },
  get habitWeek() {
    if (!this.openHabit) return [];

    return getLastTwoWeeksDates().map((date) => {
      const habit = this.habitData.find((habit) => habit.date === datestr(date) && habit.habitId === this.openHabit.id);
      return {
        date,
        day: getWeekday(date),
        habit,
      };
    });
  },
  toggleHabit(date) {
    const existing = this.habitWeek.find((day) => datestr(day.date) === datestr(date));
    if (!existing) {
      throw new Error('never');
    }
    const id = this.openHabit.id;
    console.log('toggle', { date, id });
    if (existing?.habit) {
      const opp = existing.habit?.value === 1 ? 0 : 1;
      this.writeHabitLog(id, datestr(date), opp);
    } else {
      this.writeHabitLog(id, datestr(date), 1);
    }
  },
  async writeHabitLog(habitId, date, value) {
    await upsertHabitLog(habitId, date, value);
    await this.loadHabitData();
  },
  async loadHabitData() {
    try {
      const today = new Date();
      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(today.getDate() - 14);

      const startDate = datestr(twoWeeksAgo);
      const endDate = datestr(today);

      const habitLogs = await getHabitLogsForDateRange(startDate, endDate);
      this.habitData = habitLogs;
    } catch (error) {
      this.habitData = [];
    }
  },
  getFulfilledDaysCount(habitId) {
    return this.habitData.filter((log) => log.habitId === habitId && log.value === 1).length;
  },
  saveHabit(event, editing = '') {
    const form = event.target;
    const name = form.habitname.value;
    const color = form.habitcolor.value;

    let id = editing;
    if (editing === 'new') {
      id = btoa(Math.random());
    }

    this.habits[id] = {
      name,
      color,
      id,
    };

    this.editHabit = '';
  },
}));
