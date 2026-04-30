import { requestUrl } from "obsidian";
import type { ChatMessage, ProviderConfig, ProviderRequestOptions } from "../types";
import type { IProvider } from "./IProvider";

export class OpenAIAdapter implements IProvider {
  id: string;
  name: string;

  constructor(private readonly config: ProviderConfig) {
    this.id = config.id;
    this.name = config.name;
  }

  async *complete(messages: ChatMessage[], options: ProviderRequestOptions): AsyncIterable<string> {
    if (options.signal.aborted) return;

    const response = await requestUrl({
      url: this.endpoint("chat/completions"),
      method: "POST",
      headers: this.headers(),
      contentType: "application/json",
      body: JSON.stringify({
        model: options.model || this.config.model,
        messages,
        stream: false,
        temperature: 0.3
      }),
      throw: false
    });

    if (options.signal.aborted) return;

    if (response.status >= 400) {
      throw new Error(readError(response));
    }

    yield response.json.choices?.[0]?.message?.content ?? "";
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
      headers: this.headers(),
      throw: false
    });

    if (signal.aborted) return [];

    if (response.status >= 400) {
      throw new Error(readError(response));
    }

    const payload = response.json;
    const data = Array.isArray(payload.data) ? payload.data : [];
    return data
      .map((model: { id?: unknown; name?: unknown }) => model.id ?? model.name)
      .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
      .sort((a: string, b: string) => a.localeCompare(b));
  }

  private endpoint(path: string): string {
    return `${this.config.baseURL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }
}

function readError(response: { status: number; text: string }): string {
  return response.text || `HTTP ${response.status}`;
}
