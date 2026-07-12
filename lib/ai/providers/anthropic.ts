import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/env";
import type {
  AICompletion,
  AICompletionRequest,
  AIProvider,
} from "../provider";

export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  model = serverEnv.anthropicModel();
  private client = new Anthropic({ apiKey: serverEnv.anthropicApiKey() });

  async complete(req: AICompletionRequest): Promise<AICompletion> {
    // Anthropic has no JSON mode; the JSON contract is enforced via the prompt
    // and validated downstream in structured.ts.
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: req.maxTokens ?? 1200,
      temperature: req.temperature ?? 0.4,
      system: req.system,
      messages: req.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const text = res.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");

    return {
      text,
      provider: this.name,
      model: this.model,
      usage: {
        inputTokens: res.usage.input_tokens,
        outputTokens: res.usage.output_tokens,
      },
    };
  }
}
