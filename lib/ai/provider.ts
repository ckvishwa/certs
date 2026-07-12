import "server-only";
import { serverEnv } from "@/lib/env";

/**
 * Vendor-neutral AI provider interface. Core logic depends only on this, never
 * on a concrete SDK. Providers implement `complete()`; structured/validated
 * generation is layered on top in `structured.ts`.
 */

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AICompletionRequest {
  system: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Ask the provider to emit a single JSON object. */
  json?: boolean;
}

export interface AICompletion {
  text: string;
  provider: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface AIProvider {
  name: string;
  model: string;
  complete(req: AICompletionRequest): Promise<AICompletion>;
}

let cached: AIProvider | null = null;

/** Resolve the configured provider (OpenAI default; Anthropic via AI_PROVIDER). */
export async function getProvider(): Promise<AIProvider> {
  if (cached) return cached;
  if (serverEnv.aiProvider() === "anthropic") {
    const { AnthropicProvider } = await import("./providers/anthropic");
    cached = new AnthropicProvider();
  } else {
    const { OpenAIProvider } = await import("./providers/openai");
    cached = new OpenAIProvider();
  }
  return cached;
}
