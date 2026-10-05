import { useState } from "react";
import { useLocalStorage } from "./useLocalStorage";

type Podcast = {
  id: number;
  name: string;
  image: string;
};

type SearchResult = {
  trackId: number;
  trackName: string;
  artworkUrl100: string;
};

export default function PodcastPage() {
  const [podcasts, setPodcasts] = useLocalStorage<Podcast[]>("podcasts", []);
  const [adding, setAdding] = useState(false);

  if (!adding)
    return (
      <div>
        <div className="max-h-[50vh] overflow-y-auto">
          {podcasts.length === 0 && <p>No podcasts yet.</p>}
          <ul className="flex flex-col gap-2">
            {podcasts.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <img src={p.image} alt="" className="w-10 h-10 rounded" />
                <span className="flex-1 truncate">{p.name}</span>
                <button
                  className="button"
                  onClick={() =>
                    setPodcasts(podcasts.filter((x) => x.id !== p.id))
                  }
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
        <button className="button mt-2" onClick={() => setAdding(true)}>
          +
        </button>
      </div>
    );

  return (
    <AddPodcast
      onAdd={(p) => {
        setPodcasts([...podcasts, p]);
        setAdding(false);
      }}
      onCancel={() => setAdding(false)}
    />
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
                  })
                }
              >
                <img src={r.artworkUrl100} alt="" className="w-10 h-10 rounded" />
                <span className="flex-1 truncate">{r.trackName}</span>
                <span>+</span>
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
