// slouch detection for face-landmark frontal mode: one euro filter -> self-diff
// (value now vs DIFF_LOOKBACK_S ago) -> trapezoidal integral of the diff over
// INTEGRAL_WINDOW_S, same pipeline as posture-astro src/app2/engine.ts.

import { OneEuroFilter } from "./oneEuro";

const FILTER_OPTS = { minCutoff: 1, beta: 0.3, dCutoff: 1 };
const DIFF_LOOKBACK_S = 5;
const INTEGRAL_WINDOW_S = 5;

export const PARAMS = ["pitch"] as const;

export class SlouchDetector {
    private filters = PARAMS.map(() => new OneEuroFilter(FILTER_OPTS));
    private history: { t: number; vals: number[] }[] = [];
    private diff = PARAMS.map(() => 0);
    private integral = PARAMS.map(() => 0);

    // value from which the user is considered slouching (integral units)
    slouchThresh = 45;

    /** feed one filtered sample; returns diff/integral per param + verdict */
    sample(pose: { pitch: number }, nowMs = performance.now()) {
        const raw = [-pose.pitch]; // pitch inverted: grows when slouching
        const vals: number[] = raw.map((v, i) => this.filters[i].filter(v, nowMs));

        this.history.push({ t: nowMs, vals });
        const cutoff = nowMs - (INTEGRAL_WINDOW_S + DIFF_LOOKBACK_S) * 1000;
        while (this.history.length > 1 && this.history[0].t < cutoff) this.history.shift();

        const winStart = nowMs - INTEGRAL_WINDOW_S * 1000;
        PARAMS.forEach((_, i) => {
            const past = this.sampleBefore(i, nowMs - DIFF_LOOKBACK_S * 1000);
            this.diff[i] = past === null ? 0 : vals[i] - past;

            let integral = 0;
            let prev: { t: number; d: number } | null = null;
            for (const s of this.history) {
                if (s.t < winStart) continue;
                const p = this.sampleBefore(i, s.t - DIFF_LOOKBACK_S * 1000);
                if (p === null) {
                    prev = null;
                    continue;
                }
                const cur = { t: s.t, d: s.vals[i] - p };
                if (prev) integral += ((prev.d + cur.d) / 2) * ((cur.t - prev.t) / 1000);
                prev = cur;
            }
            this.integral[i] = integral;
        });

        // any param integral above threshold = slouching
        const slouching = this.integral.some((v) => v > this.slouchThresh);
        return { vals, diff: this.diff, integral: this.integral, slouching };
    }

    // newest sample at or before cutoffT for param i (null if none)
    private sampleBefore(i: number, cutoffT: number): number | null {
        for (let j = this.history.length - 1; j >= 0; j--) {
            if (this.history[j].t <= cutoffT) return this.history[j].vals[i];
        }
        return null;
    }

    reset() {
        this.filters.forEach((f) => f.reset());
        this.history = [];
        this.diff = PARAMS.map(() => 0);
        this.integral = PARAMS.map(() => 0);
    }
}
