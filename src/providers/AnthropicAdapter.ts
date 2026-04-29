import { parseSSE } from "../core/StreamParser";
import type { ChatMessage, ProviderConfig, ProviderRequestOptions } from "../types";
import type { IProvider } from "./IProvider";

export class AnthropicAdapter implements IProvider {
  id: string;
  name: string;

  constructor(private readonly config: ProviderConfig) {
    this.id = config.id;
    this.name = config.name;
  }

  async *complete(messages: ChatMessage[], options: ProviderRequestOptions): AsyncIterable<string> {
    const system = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");

    const anthropicMessages = messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content
      }));

    const response = await fetch(this.endpoint("messages"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: options.model || this.config.model,
        max_tokens: 4096,
        system: system || undefined,
        messages: anthropicMessages,
        stream: options.stream
      }),
      signal: options.signal
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `${response.status} ${response.statusText}`);
    }

    if (!options.stream) {
      const payload = await response.json();
      yield payload.content?.map((part: { text?: string }) => part.text ?? "").join("") ?? "";
      return;
    }

    for await (const event of parseSSE(response.body)) {
      if (typeof event !== "object" || event === null) continue;
      const chunk = event as { type?: string; delta?: { text?: string } };
      if (chunk.type === "content_block_delta" && chunk.delta?.text) {
        yield chunk.delta.text;
      }
    }
  }

  async testConnection(signal: AbortSignal): Promise<void> {
    for await (const _chunk of this.complete(
      [{ role: "user", content: "Reply with OK." }],
      { stream: false, signal, timeoutMs: 10000 }
    )) {
      return;
    }
  }

  async listModels(signal: AbortSignal): Promise<string[]> {
    const response = await fetch(this.endpoint("models"), {
      method: "GET",
      headers: {
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01"
      },
      signal
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    const data = Array.isArray(payload.data) ? payload.data : [];
    return data
      .map((model: { id?: unknown; display_name?: unknown }) => model.id ?? model.display_name)
      .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
      .sort((a: string, b: string) => a.localeCompare(b));
  }

  private endpoint(path: string): string {
    return `${this.config.baseURL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  }
}
