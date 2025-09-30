import way from './framework';

way.component('clock-face', (_, ctx) => {
  const time = way.signal('_');

  const update = () => {
    const [h, m, s] = getTime();
    time.value = formatTime(h, m, s, 'hm');
    // this.time = { h, m, s, string: formatTime(h, m, s, 'hm') };
    ctx.emit('tick', { h, m, s });
  };
  update();

  const t = new Date();
  const nextSecond = 1000 - t.getMilliseconds();
  setTimeout(() => {
    setInterval(() => update(), 1000);
    update();
  }, nextSecond);

  return {
    time,
  };
});

function getTime() {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  return [h, m, s];
}

function formatTime(h: number, m: number, s: number, format: 'hm' | 'hms' = 'hm'): string {
  const _h = String(h).padStart(2, '0');
  const _m = String(m).padStart(2, '0');
  const _s = String(s).padStart(2, '0');
  if (format === 'hms') {
    return `${_h}:${_m}:${_s}`;
  }
  return `${_h}:${_m}`;
}
