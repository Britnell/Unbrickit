import { getDefaultStore, useAtom, useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { playingPodcastAtom, playingPodcastPausedAtom } from "./atoms";
import { useLocalStorage } from "./useLocalStorage";

export type Podcast = {
  id: number;
  name: string;
  image: string;
  feedUrl: string;
};

type SearchResult = {
  trackId: number;
  trackName: string;
  artworkUrl100: string;
  feedUrl: string;
};

export type Episode = {
  title: string | null;
  date: string | null;
  duration: string | null;
  audioUrl: string | null;
  img: string | null;
};

/** itunes:duration is either seconds ("229") or h:mm:ss / mm:ss.
 *  Returns minutes or hours, e.g. "40 min" or "1.5 h" */
function formatDuration(d: string | null): string | null {
  if (!d) return null;
  let s: number;
  if (/^\d+$/.test(d)) s = parseInt(d);
  else {
    const parts = d.split(":").map(Number);
    s = parts.reduce((acc, p) => acc * 60 + p, 0);
  }
  const h = s / 3600;
  if (h >= 1) return `${h.toFixed(1)} h`;
  return `${Math.round(s / 60)} min`;
}

/** European date format: day month year, e.g. "5 Mar 2025" */
function formatDate(d: string | null): string | null {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const CACHE_KEY = "podcast-episode-cache";

type CacheEntry = Episode[]; // top 20 per feed

function readCache(): Record<string, CacheEntry> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeCache(feedUrl: string, eps: Episode[]) {
  const cache = readCache();
  cache[feedUrl] = eps;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

async function fetchEpisodes(feedUrl: string): Promise<Episode[]> {
  const res = await fetch(feedUrl);
  const xml = await res.text();
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return Array.from(doc.querySelectorAll("item"))
    .slice(0, 20)
    .map((item) => ({
      title: item.querySelector("title")?.textContent ?? null,
      date: item.querySelector("pubDate")?.textContent ?? null,
      duration:
        item.getElementsByTagName("itunes:duration")[0]?.textContent ?? null,
      audioUrl: item.querySelector("enclosure")?.getAttribute("url") ?? null,
      img:
        item.getElementsByTagName("itunes:image")[0]?.getAttribute("href") ??
        null,
    }));
}

function sortEpisodes(
  eps: (Episode & { podcastName: string; img: string | null })[],
) {
  return [...eps].sort(
    (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime(),
  );
}

function useAllEpisodes(podcasts: Podcast[]) {
  const [episodes, setEpisodes] = useState<
    (Episode & { podcastName: string; img: string | null })[]
  >([]);
  const [loading, setLoading] = useState(podcasts.length > 0);

  useEffect(() => {
    let cancelled = false;

    // show cached episodes immediately
    const cache = readCache();
    const cached = podcasts.flatMap((p) =>
      (cache[p.feedUrl] ?? []).map((ep) => ({
        ...ep,
        podcastName: p.name,
        img: ep.img ?? p.image,
      })),
    );
    setEpisodes(sortEpisodes(cached));
    setLoading(!cached.length && podcasts.length > 0);

    // refresh in background
    Promise.all(
      podcasts.map((p) =>
        fetchEpisodes(p.feedUrl)
          .catch(() => [] as Episode[])
          .then((eps) => {
            writeCache(p.feedUrl, eps);
            return eps.map((ep) => ({
              ...ep,
              podcastName: p.name,
              img: ep.img ?? p.image,
            }));
          }),
      ),
    ).then((all) => {
      if (cancelled) return;
      setEpisodes(sortEpisodes(all.flat()));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [podcasts]);

  return { episodes, loading };
}

export default function PodcastPage() {
  const [podcasts, setPodcasts] = useLocalStorage<Podcast[]>("podcasts", []);
  const [view, setView] = useState<"episodes" | "manage" | "add">("episodes");
  const [playing] = useAtom(playingPodcastAtom);

  if (playing) return <EpisodePlayer />;

  if (view === "add")
    return (
      <AddPodcast
        onAdd={(p) => {
          if (!podcasts.some((x) => x.id === p.id))
            setPodcasts([...podcasts, p]);
          setView("manage");
        }}
        onCancel={() => setView("manage")}
      />
    );

  if (view === "manage")
    return (
      <ManagePodcasts
        podcasts={podcasts}
        onRemove={(id) => setPodcasts(podcasts.filter((p) => p.id !== id))}
        onAdd={() => setView("add")}
        onBack={() => setView("episodes")}
      />
    );

  return <AllEpisodes podcasts={podcasts} onManage={() => setView("manage")} />;
}

function PlayIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M6 3.5v17a1 1 0 0 0 1.53.85l13-8.5a1 1 0 0 0 0-1.7l-13-8.5A1 1 0 0 0 6 3.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M7 4h4v16H7zM13 4h4v16h-4z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}

/** single global audio element so playback survives menu close */
function formatSeconds(s: number): string {
  if (!isFinite(s)) return "0:0";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${h ? h + ":" : ""}${m}:${String(sec).padStart(2, "0")}`;
}

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

function EpisodePlayer() {
  const [episode, setEpisode] = useAtom(playingPodcastAtom);
  const paused = useAtomValue(playingPodcastPausedAtom);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);

  useEffect(() => {
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () =>
      setAudioDuration(isFinite(audio.duration) ? audio.duration : null);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  useEffect(() => {
    if (!episode?.audioUrl) return;
    const url = new URL(episode.audioUrl, location.href).href;
    if (audio.src !== url) {
      audio.src = url;
      setCurrentTime(0);
      setAudioDuration(null);
    }
    audio.play().catch(() => {});
  }, [episode]);

  if (!episode) return null;

  const toggle = () => {
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  const setEpisodeStopped = () => {
    audio.pause();
    setEpisode(null);
  };

  const skip = (s: number) => {
    audio.currentTime = Math.max(0, audio.currentTime + s);
  };

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <p className="text-center px-2 max-w-[60ch]">
        <span className="font-bold line-clamp-2 max-w-64">{episode.title}</span>
        <span className="text-sm opacity-60">
          &nbsp;- {episode.podcastName}
        </span>
      </p>
      <div className="flex items-center gap-4">
        {episode.img && (
          <img
            src={episode.img}
            alt=""
            className="w-24 h-24 rounded-lg shadow shrink-0"
          />
        )}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <button
              className="button !p-2"
              onClick={toggle}
              title="Play / pause"
            >
              {paused ? <PlayIcon /> : <PauseIcon />}
            </button>
            <div className="tabular-nums text-lg ">
              <span className="font-semibold">
                {formatSeconds(currentTime)}
              </span>
              {audioDuration && (
                <span className=" text-sm text-gray-500">
                  &nbsp; / {formatSeconds(audioDuration)}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="button"
              onClick={() => skip(-30)}
              title="Back 30s"
            >
              ↺ 30
            </button>
            <button
              className="button"
              onClick={() => skip(30)}
              title="Forward 30s"
            >
              ↻ 30
            </button>
          </div>
        </div>
      </div>

      <button className="button" onClick={setEpisodeStopped} title="Stop">
        <span className="flex items-center gap-1">
          <StopIcon /> stop
        </span>
      </button>
    </div>
  );
}

function AllEpisodes({
  podcasts,
  onManage,
}: {
  podcasts: Podcast[];
  onManage: () => void;
}) {
  const { episodes, loading } = useAllEpisodes(podcasts);
  const [, setEpisode] = useAtom(playingPodcastAtom);

  return (
    <div>
      <div className="flex items-center mb-2">
        <span className="font-bold">Episodes</span>
        <button className="button ml-auto" onClick={onManage} title="Podcasts">
          ⚙
        </button>
      </div>

      {loading && <p>Loading episodes…</p>}
      {!loading && episodes.length === 0 && <p>No episodes yet.</p>}

      <ul className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
        {episodes.map((ep, i) => (
          <li
            key={i}
            className="rounded bg-black/5 p-2 text-sm flex gap-2 items-center"
          >
            <button
              className="button shrink-0"
              title="Play"
              onClick={() =>
                setEpisode({
                  title: ep.title,
                  audioUrl: ep.audioUrl,
                  img: ep.img,
                  duration: ep.duration,
                  podcastName: ep.podcastName,
                })
              }
            >
              <PlayIcon />
            </button>
            {ep.img && (
              <img src={ep.img} alt="" className="w-10 h-10 rounded shrink-0" />
            )}
            <div className="min-w-0">
              <div className="font-medium line-clamp-2 max-w-64">{ep.title}</div>
              <div className="text-xs opacity-60">{ep.podcastName}</div>
              <div className="text-xs opacity-60">
                {formatDate(ep.date)}
                {ep.duration ? ` · ${formatDuration(ep.duration)}` : ""}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ManagePodcasts({
  podcasts,
  onRemove,
  onAdd,
  onBack,
}: {
  podcasts: Podcast[];
  onRemove: (id: number) => void;
  onAdd: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div className="flex items-center mb-2">
        <span className="font-bold">Podcasts</span>
        <button className="button ml-auto" onClick={onAdd}>
          + add
        </button>
      </div>

      {podcasts.length === 0 && <p>No podcasts yet.</p>}
      <ul className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
        {podcasts.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-2 rounded bg-black/5 p-1"
          >
            <img src={p.image} alt="" className="w-10 h-10 rounded" />
            <span className="flex-1 truncate">{p.name}</span>
            <button className="button" onClick={() => onRemove(p.id)}>
              ✕
            </button>
          </li>
        ))}
      </ul>

      <button className="button mt-2" onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}

function AddPodcast({
  onAdd,
  onCancel,
}: {
  onAdd: (p: Podcast) => void;
  onCancel: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setLoading(true);
    setResults(null);
    try {
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&media=podcast&limit=25`,
      );
      const data = await response.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (searchTerm.trim()) search();
        }}
      >
        <input
          className="flex-1 px-2 py-1 rounded border border-black/30 bg-white/70"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search podcasts…"
        />
        <button type="submit" className="button">
          Search
        </button>
      </form>

      {loading && <p className="mt-2">Searching…</p>}

      {results && results.length === 0 && !loading && (
        <p className="mt-2">No results.</p>
      )}

      {results && results.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2 max-h-[45vh] overflow-y-auto">
          {results.map((r) => (
            <li key={r.trackId}>
              <button
                className="flex items-center gap-2 w-full text-left rounded hover:bg-black/10 p-1"
                onClick={() =>
                  onAdd({
                    id: r.trackId,
                    name: r.trackName,
                    image: r.artworkUrl100,
                    feedUrl: r.feedUrl,
                  })
                }
              >
                <img
                  src={r.artworkUrl100}
                  alt=""
                  className="w-10 h-10 rounded"
                />
                <span className="flex-1 truncate">{r.trackName}</span>
                <span className="button !px-2 !py-1">+</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button className="button mt-2" onClick={onCancel}>
        ← Back
      </button>
    </div>
  );
}

/** little widget shown while a podcast is playing; opens podcast menu */
export function PodcastWidget({ onOpen }: { onOpen: () => void }) {
  const episode = useAtomValue(playingPodcastAtom);
  if (!episode) return null;
  return (
    <button
      className="button flex items-center gap-1"
      onClick={onOpen}
      title={episode.title ?? "Podcast"}
    >
      🎙️
      <span className="text-xs">
        <PlayIcon size={12} />
      </span>
    </button>
  );
}
