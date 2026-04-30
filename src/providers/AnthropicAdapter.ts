import { requestUrl } from "obsidian";
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
    if (options.signal.aborted) return;

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

    const response = await requestUrl({
      url: this.endpoint("messages"),
      method: "POST",
      headers: {
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01"
      },
      contentType: "application/json",
      body: JSON.stringify({
        model: options.model || this.config.model,
        max_tokens: 4096,
        system: system || undefined,
        messages: anthropicMessages,
        stream: false
      }),
      throw: false
    });

    if (options.signal.aborted) return;

    if (response.status >= 400) {
      throw new Error(response.text || `HTTP ${response.status}`);
    }

    yield response.json.content?.map((part: { text?: string }) => part.text ?? "").join("") ?? "";
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
    if (signal.aborted) return [];

    const response = await requestUrl({
      url: this.endpoint("models"),
      method: "GET",
      headers: {
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01"
      },
      throw: false
    });

    if (signal.aborted) return [];

    if (response.status >= 400) {
      throw new Error(response.text || `HTTP ${response.status}`);
    }

    const payload = response.json;
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
