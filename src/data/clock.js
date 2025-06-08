import Alpine from 'alpinejs';
import { getTime, formatTime } from '../helper';

Alpine.data('clock', () => ({
  time: {},
  clockInterval: null,
  init() {
    this.updateTime();

    const t = new Date();
    const nextSecond = 1000 - t.getMilliseconds();

    setTimeout(() => {
      this.updateTime();
      this.clockInterval = setInterval(() => {
        this.updateTime();
      }, 1000);
    }, nextSecond);
  },
  updateTime() {
    const [h, m, s] = getTime();
    this.time = { h, m, s, string: formatTime(h, m, s, 'hm') };
    const el = this.$refs.clock;
    const ev = new CustomEvent('tick', {
      bubbles: true,
      detail: {
        h,
        m,
        s,
      },
    });
    el.dispatchEvent(ev);
  },
  loop() {
    this.updateTime();
  },
}));
