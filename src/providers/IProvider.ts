import type { ChatMessage, ProviderRequestOptions } from "../types";

export interface IProvider {
  id: string;
  name: string;
  complete(messages: ChatMessage[], options: ProviderRequestOptions): AsyncIterable<string>;
  testConnection(signal: AbortSignal): Promise<void>;
  listModels(signal: AbortSignal): Promise<string[]>;
}
