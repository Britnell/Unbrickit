import { search } from "./jev";

// Server-only logic, never bundled for the client
export async function generateReply(prompt: string) {
  await search(prompt);
  return [];
}
