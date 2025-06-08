export function getTime() {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  return [h, m, s];
}

export function formatTime(h: number, m: number, s: number, format: 'hm' | 'hms' = 'hm'): string {
  const _h = String(h).padStart(2, '0');
  const _m = String(m).padStart(2, '0');
  const _s = String(s).padStart(2, '0');
  if (format === 'hms') {
    return `${_h}:${_m}:${_s}`;
  }
  return `${_h}:${_m}`;
}

export function safeParse(key: string) {
  const str = localStorage.getItem(key);
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export function getLastTwoWeeksDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();

  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date);
  }

  return dates;
}

export function getWeekday(date: Date, l: number = 2): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()].slice(0, l);
}

export function datestr(date: Date | string) {
  let d: Date;
  if (typeof date === 'string') d = new Date(date);
  else d = date;
  return d.toISOString().split('T')[0];
}

export function getRandom(min: number, max: number, round: number = 1): number {
  const r = Math.random() * (max - min) + min;
  return Math.round(r / round) * round;
}
