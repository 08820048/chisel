import type { ChiselSettings, ProviderConfig } from "../types";
import type { IProvider } from "./IProvider";
import { AnthropicAdapter } from "./AnthropicAdapter";
import { OpenAIAdapter } from "./OpenAIAdapter";

export function createDefaultProviders(): ProviderConfig[] {
  return [
    {
      id: "openai",
      name: "OpenAI",
      type: "openai",
      baseURL: "https://api.openai.com/v1",
      apiKey: "",
      model: "gpt-4o"
    },
    {
      id: "anthropic",
      name: "Anthropic",
      type: "anthropic",
      baseURL: "https://api.anthropic.com/v1",
      apiKey: "",
      model: "claude-sonnet-4-5"
    },
    {
      id: "gemini",
      name: "Google Gemini",
      type: "openai",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
      apiKey: "",
      model: "gemini-2.0-flash"
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      type: "openai",
      baseURL: "https://api.deepseek.com",
      apiKey: "",
      model: "deepseek-chat"
    }
  ];
}

export class ProviderManager {
  constructor(private readonly getSettings: () => ChiselSettings) {}

  listProviders(): ProviderConfig[] {
    return this.getSettings().providers;
  }

  getProviderConfig(providerId?: string): ProviderConfig {
    const settings = this.getSettings();
    const id = providerId || settings.defaultProviderId;
    const provider = settings.providers.find((item) => item.id === id);

    if (!provider) {
      throw new Error(`Provider not found: ${id}`);
    }

    return provider;
  }

  getProvider(providerId?: string): IProvider {
    const config = this.getProviderConfig(providerId);

    if (config.type === "anthropic") {
      return new AnthropicAdapter(config);
    }

    return new OpenAIAdapter(config);
  }
}
