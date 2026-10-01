import { search } from "./jev";

// Server-only logic, never bundled for the client
export async function generateReply(prompt: string) {
  const searchRes = await search(prompt);
  return [];
}
