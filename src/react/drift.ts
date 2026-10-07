// y-drift of a landmark point set: sum of per-point y diffs vs LOOKBACK ago
// (positive = points moved down), EMA-smoothed, then trapezoidally integrated
// over WINDOW. Used by both the face-landmark and pose-landmark paths with
// separate instances so their histories never mix.

const LOOKBACK_S = 3;
const WINDOW_S = 4;
const ALPHA = 0.25;
const KEEP_BEFORE_S = LOOKBACK_S + 2;

export interface DriftValue {
  dy: number;
  integ: number;
}

export class YDriftMeter {
  private history: { t: number; vals: number[] }[] = [];
  private magHist: { t: number; m: number }[] = [];
  private sm = 0;
  private init = false;

  /** feed one landmark frame; null until lookback history exists */
  value(
    lm: { y: number }[],
    pointIds: number[],
    now = performance.now(),
  ): DriftValue | null {
    const vals = pointIds.map((i) => lm[i].y);
    this.history.push({ t: now, vals });
    const cutoff = now - LOOKBACK_S * 1000;
    let past: number[] | null = null;
    for (let j = this.history.length - 1; j >= 0; j--) {
      if (this.history[j].t <= cutoff) {
        past = this.history[j].vals;
        break;
      }
    }
    while (this.history.length > 1 && this.history[0].t < cutoff - KEEP_BEFORE_S * 1000)
      this.history.shift();
    if (!past) return null;

    // sum of per-point y diffs: max when all points move down together,
    // cancels out when they move oppositely (rotation)
    const dy = vals.reduce((s, v, k) => s + (v - past[k]), 0);
    if (!this.init) {
      this.sm = dy;
      this.init = true;
    } else this.sm += ALPHA * (dy - this.sm);

    this.magHist.push({ t: now, m: this.sm });
    const winStart = now - WINDOW_S * 1000;
    while (this.magHist.length > 1 && this.magHist[0].t < winStart)
      this.magHist.shift();
    let integ = 0;
    for (let i = 1; i < this.magHist.length; i++) {
      const a = this.magHist[i - 1],
        b = this.magHist[i];
      integ += ((a.m + b.m) / 2) * ((b.t - a.t) / 1000);
    }
    return { dy: this.sm, integ };
  }

  reset() {
    this.history = [];
    this.magHist = [];
    this.sm = 0;
    this.init = false;
  }
}
