// slouch detection for a single signed angle: one euro filter -> self-diff
// (value now vs DIFF_LOOKBACK_S ago) -> trapezoidal integral of the diff over
// INTEGRAL_WINDOW_S, same pipeline as posture-astro src/app2/engine.ts.
//
// Feed a value that grows while slouching (face mode: -pitch; pose mode: neck
// tilt, already + = leaning forward). Use one instance per source so their
// integrals never mix.

import { OneEuroFilter } from "./oneEuro";

const FILTER_OPTS = { minCutoff: 1, beta: 0.3, dCutoff: 1 };
const DIFF_LOOKBACK_S = 5;
const INTEGRAL_WINDOW_S = 5;

export class SlouchDetector {
  private filter = new OneEuroFilter(FILTER_OPTS);
  private history: { t: number; v: number }[] = [];

  // value from which the user is considered slouching (integral units)
  slouchThresh = 45;

  /** feed one raw sample; returns diff/integral + verdict */
  sample(value: number, nowMs = performance.now()) {
    const v = this.filter.filter(value, nowMs);

    this.history.push({ t: nowMs, v });
    const cutoff = nowMs - (INTEGRAL_WINDOW_S + DIFF_LOOKBACK_S) * 1000;
    while (this.history.length > 1 && this.history[0].t < cutoff)
      this.history.shift();

    const past = this.sampleBefore(nowMs - DIFF_LOOKBACK_S * 1000);
    const diff = past === null ? 0 : v - past;

    let integral = 0;
    let prev: { t: number; d: number } | null = null;
    const winStart = nowMs - INTEGRAL_WINDOW_S * 1000;
    for (const s of this.history) {
      if (s.t < winStart) continue;
      const p = this.sampleBefore(s.t - DIFF_LOOKBACK_S * 1000);
      if (p === null) {
        prev = null;
        continue;
      }
      const cur = { t: s.t, d: s.v - p };
      if (prev) integral += ((prev.d + cur.d) / 2) * ((cur.t - prev.t) / 1000);
      prev = cur;
    }

    return {
      value: v,
      diff,
      integral,
      slouching: integral > this.slouchThresh,
    };
  }

  // newest sample value at or before cutoffT (null if none)
  private sampleBefore(cutoffT: number): number | null {
    for (let j = this.history.length - 1; j >= 0; j--) {
      if (this.history[j].t <= cutoffT) return this.history[j].v;
    }
    return null;
  }

  reset() {
    this.filter.reset();
    this.history = [];
  }
}
