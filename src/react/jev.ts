// jev model: parse a user's question into a web search query
// ported from sortmylifeout src/serverFn/{jev.server,prompt,textSpans}.ts

// filler words - a span is dropped if its FIRST or LAST word is in here
const STOP = new Set(
  `a an the and or but to of in on at for with by from about as is are was were be been it its this that these those
	i me my we our you your he she they them what whats what's how how's when where which who whom why will would can could should
	please pls hey hi hello ok okay so just also too then than there here do does did doing any some all
	set turn put make give tell show find search look up add get check going go need want like
	today tomorrow tonight now`.split(/\s+/),
);

const MAX_SPANS = 150;
const MAX_WORDS = 7;

/**
 * Split a prompt into search-query candidate strings:
 * all contiguous word spans (1..7 words) whose first/last word is not a
 * stop word. Deduped, longest first.
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

  // contiguous spans, longest first, stop words only checked at the edges
  for (let n = Math.min(MAX_WORDS, words.length); n >= 1; n--) {
    for (let i = 0; i + n <= words.length; i++) {
      const span = words.slice(i, i + n);
      if (STOP.has(span[0].toLowerCase())) continue;
      if (STOP.has(span[span.length - 1].toLowerCase())) continue;
      push(span.join(" "));
    }
  }
  return out.slice(0, MAX_SPANS);
};

export type Answer<K extends string = string> = {
  type: "choice";
  choice: K | "none";
  confidence: number;
  probabilities: Record<string, number>;
};

export type JevResult = {
  answers: {
    search_query: Answer;
  };
};

export const search = async (prompt: string): Promise<JevResult | string> => {
  const q = {
    model: "jev-latest",
    state: {
      prompt,
      context:
        "A voice/web assistant that answers the user's question by googling / web searching for the answer.",
    },
    questions: {
      search_query: {
        type: "choice",
        instructions: `The web search query to google for the answer. Pick the option that best captures what the user wants to know - short, no filler or question words. Prefer shorter spans over longer ones that include irrelevant extra words.`,
        criteria: {
          ...Object.fromEntries(promptSpans(prompt).map((s) => [s, s])),
          none: "no suitable search query in prompt",
        },
      },
    },
  };
  const searchQuery = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_TYPESAFE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(q),
  }).then((res) => (res.ok ? res.json() : res.text()));

  console.log(searchQuery);
  return {};
};

/** Parse a prompt into a google search query. Returns '' if none found. */
export async function searchQuery(prompt: string): Promise<string> {
  const res = await search(prompt);
  if (typeof res === "string") throw new Error(`jev failed: ${res}`);
  const { choice } = res.answers.search_query;
  return choice === "none" ? "" : String(choice);
}
