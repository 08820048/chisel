import { requestUrl } from "obsidian";
import type { ChatMessage, ProviderConfig, ProviderRequestOptions } from "../types";
import type { IProvider } from "./IProvider";

const STATIC_MODEL_LISTS: Record<string, string[]> = {
  xiaomimimo: [
    "mimo-v2.5-pro",
    "mimo-v2.5",
    "mimo-v2.5-tts",
    "mimo-v2.5-tts-voicedesign",
    "mimo-v2.5-tts-voiceclone",
    "mimo-v2-pro",
    "mimo-v2-omni",
    "mimo-v2-tts",
    "mimo-v2-flash"
  ],
  zai: [
    "glm-5.1",
    "glm-5.1v-thinking-flash",
    "glm-5.1v-flash"
  ]
};

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
      const staticModels = this.staticModelsForUnsupportedList(response.status);
      if (staticModels) return staticModels;
      throw new Error(readError(response));
    }

    const payload = response.json;
    const data = Array.isArray(payload.data) ? payload.data : [];
    const models = data
      .map((model: { id?: unknown; name?: unknown }) => model.id ?? model.name)
      .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
      .sort((a: string, b: string) => a.localeCompare(b));
    return models.length > 0 ? models : STATIC_MODEL_LISTS[this.config.id] ?? [];
  }

  private endpoint(path: string): string {
    return `${this.config.baseURL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (this.config.apiKey) {
      if (this.config.id === "xiaomimimo") {
        headers["api-key"] = this.config.apiKey;
      } else {
        headers.Authorization = `Bearer ${this.config.apiKey}`;
      }
    }

    return headers;
  }

  private staticModelsForUnsupportedList(status: number): string[] | null {
    if (status !== 404 && status !== 405 && status !== 501) return null;
    return STATIC_MODEL_LISTS[this.config.id] ?? null;
  }
}

function readError(response: { status: number; text: string }): string {
  return response.text || `HTTP ${response.status}`;
}
