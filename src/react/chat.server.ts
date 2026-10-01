import { search } from "./jev";

// Server-only logic, never bundled for the client
export async function generateReply(prompt: string) {
  console.log({ prompt });
  const searchRes = await search(prompt);
  return [];
}
