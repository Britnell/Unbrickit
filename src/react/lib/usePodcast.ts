import { getDefaultStore, useAtom, useAtomValue } from "jotai";
import { playingPodcastAtom, playingPodcastPausedAtom, PlayingEpisode } from "./atoms";
import { Episode } from "../component/Podcast";

/** single global audio element so playback survives menu close.
 *  kept on window so Vite HMR reuses the same element instead of
 *  creating a second one and replaying from the start. */
const globalAudio = window as typeof window & {
  __podcastAudio?: HTMLAudioElement;
};
const audio = (globalAudio.__podcastAudio ??= new Audio());
audio.preload = "none";

const store = getDefaultStore();
audio.addEventListener("play", () =>
  store.set(playingPodcastPausedAtom, false),
);
audio.addEventListener("pause", () =>
  store.set(playingPodcastPausedAtom, true),
);
audio.addEventListener("ended", () => store.set(playingPodcastAtom, null));

/** play an episode (or set the current one and start it) */
export function playEpisode(ep: PlayingEpisode) {
  store.set(playingPodcastAtom, ep);
  if (ep.audioUrl) {
    const url = new URL(ep.audioUrl, location.href).href;
    if (audio.src !== url) {
      audio.src = url;
    }
    audio.play().catch(() => {});
  }
}

/** resume the current episode, or start the latest cached episode.
 *  returns false when there is no current episode and no cached episodes */
export function startPodcast(): boolean {
  const current = store.get(playingPodcastAtom);
  if (current) {
    audio.play().catch(() => {});
    return true;
  }
  // latest episode across all subscribed feeds from the episode cache
  const cache: Record<string, Episode[]> = (() => {
    try {
      return JSON.parse(
        localStorage.getItem("podcast-episode-cache") ?? "{}",
      );
    } catch {
      return {};
    }
  })();
  const podcasts: { feedUrl: string; name: string; image: string }[] =
    (() => {
    try {
      return JSON.parse(localStorage.getItem("podcasts") ?? "[]");
    } catch {
      return [];
    }
  })();
  const eps = podcasts
    .flatMap((p) =>
      (cache[p.feedUrl] ?? []).map((ep) => ({
        ...ep,
        img: ep.img ?? p.image,
        podcastName: p.name,
      })),
    )
    .filter((ep) => ep.audioUrl)
    .sort(
      (a, b) =>
        new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime(),
    );
  if (eps.length) {
    playEpisode(eps[0]);
    return true;
  }
  return false;
}

export function stopPodcast() {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  store.set(playingPodcastAtom, null);
  store.set(playingPodcastPausedAtom, false);
}

export function pausePodcast() {
  audio.pause();
}

export function togglePodcast() {
  if (audio.paused) audio.play().catch(() => {});
  else audio.pause();
}

/** podcast state + controls for the UI */
export function usePodcast() {
  const [episode, setEpisode] = useAtom(playingPodcastAtom);
  const paused = useAtomValue(playingPodcastPausedAtom);
  return {
    episode,
    paused,
    setEpisode,
    start: startPodcast,
    stop: stopPodcast,
    toggle: togglePodcast,
    audio,
  };
}
