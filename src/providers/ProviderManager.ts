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
      model: "gpt-4o",
      enabled: false
    },
    {
      id: "anthropic",
      name: "Anthropic",
      type: "anthropic",
      baseURL: "https://api.anthropic.com/v1",
      apiKey: "",
      model: "claude-sonnet-4-5",
      enabled: false
    },
    {
      id: "gemini",
      name: "Google Gemini",
      type: "openai",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
      apiKey: "",
      model: "gemini-2.0-flash",
      enabled: false
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      type: "openai",
      baseURL: "https://api.deepseek.com",
      apiKey: "",
      model: "deepseek-chat",
      enabled: false
    },
    {
      id: "minimax",
      name: "MiniMax",
      type: "openai",
      baseURL: "https://api.minimaxi.com/v1",
      apiKey: "",
      model: "MiniMax-M2.7",
      enabled: false
    },
    {
      id: "xiaomimimo",
      name: "Xiaomi MiMo",
      type: "openai",
      baseURL: "https://api.xiaomimimo.com/v1",
      apiKey: "",
      model: "mimo-v2.5-pro",
      enabled: false
    },
    {
      id: "zai",
      name: "Z.ai",
      type: "openai",
      baseURL: "https://api.z.ai/api/paas/v4",
      apiKey: "",
      model: "glm-5.1",
      enabled: false
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
    return this.createProvider(config);
  }

  createProvider(config: ProviderConfig): IProvider {
    if (config.type === "anthropic") {
      return new AnthropicAdapter(config);
    }

    return new OpenAIAdapter(config);
  }

  getRunnableProviders(primaryProviderId?: string): ProviderConfig[] {
    const providers = this.getSettings().providers;
    const primary = primaryProviderId ? providers.find((provider) => provider.id === primaryProviderId) : undefined;
    const fallbackProviders = providers.filter((provider) => provider.id !== primaryProviderId);
    return [primary, ...fallbackProviders].filter((provider): provider is ProviderConfig => {
      if (!provider) return false;
      return this.isProviderRunnable(provider);
    });
  }

  isProviderRunnable(provider: ProviderConfig): boolean {
    return Boolean(provider.enabled) && this.hasProviderCredential(provider);
  }

  hasProviderCredential(provider: ProviderConfig): boolean {
    return provider.apiKey.trim().length > 0;
  }
}
