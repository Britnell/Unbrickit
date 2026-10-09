import { radioAudio } from "./useRadio";
import { podcastAudio } from "./usePodcast";

/** remember pre-duck volumes so restore is exact */
const vols = new Map<HTMLAudioElement, number>();

/** lower radio/podcast volume while the voice chat is listening */
export function duckMedia(on: boolean) {
  for (const el of [radioAudio, podcastAudio]) {
    if (on) {
      if (el.volume > 0.2 && !vols.has(el)) {
        vols.set(el, el.volume);
        el.volume = 0.2;
      }
    } else {
      const v = vols.get(el);
      if (v !== undefined) {
        el.volume = v;
        vols.delete(el);
      }
    }
  }
}
