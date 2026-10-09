const MAX_SPANS = 150;

/**
 * Split a prompt into all combinations of consecutive words:
 * for every start/end pair, the span words[i..j].
 * Deduped, longest first.
 */
export const promptSpans = (prompt: string): string[] => {
  const words = prompt
    .replace(/[“”"]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}$#@]+|[^\p{L}\p{N}%]+$/gu, ""))
    .filter(Boolean);

  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const k = s.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(s);
    }
  };

  // all contiguous spans, longest first
  for (let n = words.length; n >= 1; n--) {
    for (let i = 0; i + n <= words.length; i++) {
      push(words.slice(i, i + n).join(" "));
    }
  }
  return out.slice(0, MAX_SPANS);
};
