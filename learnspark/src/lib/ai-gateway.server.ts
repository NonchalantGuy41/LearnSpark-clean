import { createOpenAI } from "@ai-sdk/openai";

export function createAiProvider(apiKey: string) {
  return createOpenAI({
    apiKey,
  });
}
