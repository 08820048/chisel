import { parseSSE } from "../core/StreamParser";
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
    const response = await fetch(this.endpoint("chat/completions"), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: options.model || this.config.model,
        messages,
        stream: options.stream,
        temperature: 0.3
      }),
      signal: options.signal
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    if (!options.stream) {
      const payload = await response.json();
      yield payload.choices?.[0]?.message?.content ?? "";
      return;
    }

    for await (const event of parseSSE(response.body)) {
      if (typeof event !== "object" || event === null) continue;
      const chunk = event as { choices?: Array<{ delta?: { content?: string } }> };
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) yield text;
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
      headers: this.headers(),
      signal
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const payload = await response.json();
    const data = Array.isArray(payload.data) ? payload.data : [];
    return data
      .map((model: { id?: unknown; name?: unknown }) => model.id ?? model.name)
      .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
      .sort((a: string, b: string) => a.localeCompare(b));
  }

  private endpoint(path: string): string {
    return `${this.config.baseURL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  }

  private headers(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  return text || `${response.status} ${response.statusText}`;
}
