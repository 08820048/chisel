import type { Editor, EditorPosition, TFile } from "obsidian";
import type { Locale } from "./i18n";

export type OutputMode = "replace" | "append" | "insert_below" | "popup" | "diff";
export type TriggerMode = "immediate" | "hotkey";
export type ProviderType = "openai" | "anthropic" | "custom";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseURL: string;
  apiKey: string;
  model: string;
  enabled?: boolean;
  models?: string[];
  modelsFetchedAt?: string;
}

export interface ActionPreference {
  visible: boolean;
  order: number;
  output?: OutputMode;
  providerId?: string;
}

export interface ChiselAction {
  id: string;
  name: string;
  icon: string;
  prompt: string;
  output: OutputMode;
  providerId?: string;
  model?: string;
  visible: boolean;
  order: number;
  builtin: boolean;
  hotkey?: string;
}

export interface CustomActionConfig {
  id: string;
  name: string;
  icon: string;
  prompt: string;
  output: OutputMode;
  providerId?: string;
  model?: string;
  visible: boolean;
  order: number;
  hotkey?: string;
}

export interface TranslationSettings {
  sourceLanguage: string;
  targetLanguage: string;
}

export interface ChiselSettings {
  locale: Locale;
  triggerMode: TriggerMode;
  defaultProviderId: string;
  defaultOutput: OutputMode;
  requestTimeoutMs: number;
  providers: ProviderConfig[];
  actionPreferences: Record<string, ActionPreference>;
  customActions: CustomActionConfig[];
  translation: TranslationSettings;
}

export interface SelectionRange {
  from: EditorPosition;
  to: EditorPosition;
}

export interface ActionContext {
  editor: Editor;
  file: TFile | null;
  selection: string;
  range: SelectionRange;
  filename: string;
  language: string;
}

export interface ProviderRequestOptions {
  stream: boolean;
  signal: AbortSignal;
  model?: string;
  timeoutMs: number;
}
