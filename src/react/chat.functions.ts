import { createServerFn } from "@tanstack/react-start";
import { generateReply } from "./chat.server";

export const getChatReply = createServerFn({ method: "POST" })
  .validator((data: { prompt: string }) => data)
  .handler(async ({ data }) => {
    return generateReply(data.prompt);
  });
