import { getDefaultStore, useAtom, useAtomValue } from "jotai";
import { playingPodcastAtom, playingPodcastPausedAtom, PlayingEpisode } from "./atoms";
import { Episode } from "../component/Podcast";

/** single global podcastAudio element so playback survives menu close.
 *  kept on window so Vite HMR reuses the same element instead of
 *  creating a second one and replaying from the start. */
const globalAudio = window as typeof window & {
  __podcastAudio?: HTMLAudioElement;
};
export const podcastAudio = (globalAudio.__podcastAudio ??= new Audio());
podcastAudio.preload = "none";

const store = getDefaultStore();
podcastAudio.addEventListener("play", () =>
  store.set(playingPodcastPausedAtom, false),
);
podcastAudio.addEventListener("pause", () =>
  store.set(playingPodcastPausedAtom, true),
);
podcastAudio.addEventListener("ended", () => store.set(playingPodcastAtom, null));

/** play an episode (or set the current one and start it) */
export function playEpisode(ep: PlayingEpisode) {
  store.set(playingPodcastAtom, ep);
  if (ep.audioUrl) {
    const url = new URL(ep.audioUrl, location.href).href;
    if (podcastAudio.src !== url) {
      podcastAudio.src = url;
    }
    podcastAudio.play().catch(() => {});
  }
}

/** resume the current episode, or start the latest cached episode.
 *  returns false when there is no current episode and no cached episodes */
export function startPodcast(): boolean {
  const current = store.get(playingPodcastAtom);
  if (current) {
    podcastAudio.play().catch(() => {});
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
  podcastAudio.pause();
  podcastAudio.removeAttribute("src");
  podcastAudio.load();
  store.set(playingPodcastAtom, null);
  store.set(playingPodcastPausedAtom, false);
}

export function pausePodcast() {
  podcastAudio.pause();
}

export function togglePodcast() {
  if (podcastAudio.paused) podcastAudio.play().catch(() => {});
  else podcastAudio.pause();
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
    audio: podcastAudio,
  };
}
