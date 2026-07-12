import "server-only";
import OpenAI from "openai";
import { serverEnv } from "@/lib/env";
import type {
  AICompletion,
  AICompletionRequest,
  AIProvider,
} from "../provider";

export class OpenAIProvider implements AIProvider {
  name = "openai";
  model = serverEnv.openaiModel();
  private client = new OpenAI({ apiKey: serverEnv.openaiApiKey() });

  async complete(req: AICompletionRequest): Promise<AICompletion> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      temperature: req.temperature ?? 0.4,
      max_tokens: req.maxTokens ?? 1200,
      response_format: req.json ? { type: "json_object" } : undefined,
      messages: [
        { role: "system", content: req.system },
        ...req.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    return {
      text: res.choices[0]?.message?.content ?? "",
      provider: this.name,
      model: this.model,
      usage: {
        inputTokens: res.usage?.prompt_tokens ?? 0,
        outputTokens: res.usage?.completion_tokens ?? 0,
      },
    };
  }
}
