import OpenAI from "openai";

export function formatAssistantError(e: unknown): string {
  if (e instanceof OpenAI.APIError) {
    if (e.status === 429) {
      return "RootSense AI is temporarily unavailable due to API usage limits. Please try again later.";
    }
    if (e.status === 401) {
      return "RootSense AI is not configured correctly (invalid API key).";
    }
    if (e.message) {
      return `Assistant error: ${e.message}`;
    }
  }
  if (e instanceof Error && e.message) {
    return `Assistant error: ${e.message}`;
  }
  return "Something went wrong talking to the assistant.";
}
