import { promptSpans } from "./helper";

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

const jevApi = (q: object) =>
  fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(q),
  }).then((res) => (res.ok ? res.json() : res.text()));

export const search = async (prompt: string): Promise<Array<any>> => {
  console.log({ prompt });

  const q = {
    model: "jev-latest",
    state: {
      prompt,
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

  console.log(q.questions.search_query);
  return [];

  const res = await jevApi(q);

  if (typeof res === "string") {
    console.log(res);
    return [];
  }
  console.log(res.answers);

  return [];
};
