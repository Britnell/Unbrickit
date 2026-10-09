// One-shot dictation using the Web Speech API (Chrome, server-based).
export interface DictationResult {
  transcript: string;
  /** true if recognition ended without hearing anything */
  empty: boolean;
}

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function getCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Listen for a single utterance (non-continuous, auto-stops on silence).
 * Resolves with the final transcript. Rejects on errors (e.g. not-allowed).
 * onInterim is called with each interim (non-final) transcript chunk; return
 * true from it to abort recognition early (fast command detection).
 */
export function dictateOnce(
  lang = "en-US",
  timeoutMs = 10000,
  onInterim?: (text: string) => boolean,
): Promise<DictationResult> {
  return new Promise((resolve, reject) => {
    const Ctor = getCtor();
    if (!Ctor) {
      reject(new Error("SpeechRecognition not supported in this browser"));
      return;
    }
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false; // single utterance, auto-stops
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let finalText = "";
    let settled = false;
    let earlyText = ""; // matched via onInterim

    const finish = (err?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
      const text = earlyText || finalText.trim();
      if (err) reject(err);
      else resolve({ transcript: text.trim(), empty: !text.trim() });
    };

    // hard timeout in case the engine never fires onend
    const timer = setTimeout(() => finish(), timeoutMs);

    // interim results can arrive as separate chunks (one per new words),
    // so accumulate per result index and feed the joined text to onInterim
    const interimChunks: string[] = [];

    rec.onresult = (e: any) => {
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          finalText += r[0].transcript;
          interimChunks[i] = ""; // replaced by final
        } else {
          interimChunks[i] = r[0].transcript;
        }
      }
      const interim = interimChunks.join(" ").trim();
      if (interim && onInterim?.(interim)) {
        earlyText = interim;
        finish();
      }
    };
    rec.onerror = (e: any) =>
      finish(new Error(`SpeechRecognition: ${e.error}`));
    rec.onend = () => finish();

    rec.start();
  });
}
