import { App, Notice } from "obsidian";
import { PromptBuilder } from "./PromptBuilder";
import { EditorWriter } from "./EditorWriter";
import type { ActionContext, ChatMessage, ChiselAction, ChiselSettings, OutputMode, ProviderConfig } from "../types";
import { ProviderManager } from "../providers/ProviderManager";
import { ResultModal } from "../ui/ResultModal";

interface RunningRequest {
  controller: AbortController;
  timeoutId: number;
  modal?: ResultModal;
}

export class ActionRunner {
  private running: RunningRequest | null = null;
  private readonly writer = new EditorWriter();
  private readonly promptBuilder: PromptBuilder;

  constructor(
    private readonly app: App,
    private readonly providerManager: ProviderManager,
    private readonly getSettings: () => ChiselSettings
  ) {
    this.promptBuilder = new PromptBuilder(getSettings);
  }

  async run(action: ChiselAction, context: ActionContext): Promise<void> {
    this.cancelCurrent();

    const settings = this.getSettings();
    const providerId = action.providerId || settings.actionPreferences[action.id]?.providerId || settings.defaultProviderId;
    const locale = settings.locale;
    const providerConfigs = this.providerManager.getRunnableProviders(providerId);

    if (providerConfigs.length === 0) {
      new Notice(
        locale === "zh"
          ? "没有可用的模型提供商。请先配置 API Key 并启用至少一个 Provider。"
          : "No available providers. Configure an API key and enable at least one provider first."
      );
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), settings.requestTimeoutMs);
    const request: RunningRequest = { controller, timeoutId };
    this.running = request;

    const messages = this.promptBuilder.build(action, context);
    const output = action.output || settings.defaultOutput;

    try {
      if (output === "popup" || output === "diff") {
        await this.runInModal(action, context, providerConfigs, messages, output, request);
      } else {
        new Notice(locale === "zh" ? `${action.name}生成中，按 Esc 可取消` : `${action.name} is generating. Press Esc to cancel.`);
        const result = await this.collectWithFallback(providerConfigs, messages, action, request);
        this.writer.applyResult(context.editor, context.range, result, output);
        new Notice(locale === "zh" ? `${action.name}完成` : `${action.name} complete`);
      }
    } catch (error) {
      if (controller.signal.aborted) {
        new Notice(locale === "zh" ? "已取消 Chisel 请求" : "Chisel request cancelled");
      } else if (request.modal) {
        request.modal.setError(error instanceof Error ? error.message : String(error));
      } else {
        new Notice(error instanceof Error ? error.message : String(error));
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (this.running === request) {
        this.running = null;
      }
    }
  }

  cancelCurrent(): void {
    if (!this.running) return;
    this.running.controller.abort();
    window.clearTimeout(this.running.timeoutId);
    this.running.modal?.markCancelled();
    this.running = null;
  }

  private async runInModal(
    action: ChiselAction,
    context: ActionContext,
    providerConfigs: ProviderConfig[],
    messages: ChatMessage[],
    output: OutputMode,
    request: RunningRequest
  ): Promise<void> {
    const firstProvider = providerConfigs[0];
    const modal = new ResultModal(this.app, {
      actionName: action.name,
      locale: this.getSettings().locale,
      model: `${firstProvider.name} · ${action.model || firstProvider.model}`,
      original: context.selection,
      defaultOutput: output,
      onApply: (mode, result) => this.writer.applyResult(context.editor, context.range, result, mode),
      onCancel: () => this.cancelCurrent(),
      onRetry: () => void this.run(action, context)
    });
    request.modal = modal;
    modal.open();

    const errors: string[] = [];
    for (const providerConfig of providerConfigs) {
      if (modal.hasResult()) {
        break;
      }

      modal.resetResult(`${providerConfig.name} · ${action.model || providerConfig.model}`);
      try {
        const stream = this.createStream(providerConfig, messages, action, request);
        for await (const chunk of stream) {
          if (request.controller.signal.aborted) throw new Error("Request aborted");
          modal.appendChunk(chunk);
        }
        modal.finish();
        return;
      } catch (error) {
        if (request.controller.signal.aborted) throw error;
        errors.push(`${providerConfig.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    modal.setError(errors.join("\n\n"));
  }

  private async collectWithFallback(
    providerConfigs: ProviderConfig[],
    messages: ChatMessage[],
    action: ChiselAction,
    request: RunningRequest
  ): Promise<string> {
    const errors: string[] = [];
    for (const providerConfig of providerConfigs) {
      try {
        let result = "";
        const stream = this.createStream(providerConfig, messages, action, request);
        for await (const chunk of stream) {
          if (request.controller.signal.aborted) throw new Error("Request aborted");
          result += chunk;
        }
        return result;
      } catch (error) {
        if (request.controller.signal.aborted) throw error;
        errors.push(`${providerConfig.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    throw new Error(errors.join("\n\n"));
  }

  private createStream(
    providerConfig: ProviderConfig,
    messages: ChatMessage[],
    action: ChiselAction,
    request: RunningRequest
  ): AsyncIterable<string> {
    const settings = this.getSettings();
    const provider = this.providerManager.createProvider(providerConfig);
    return provider.complete(messages, {
      stream: true,
      signal: request.controller.signal,
      model: action.model,
      timeoutMs: settings.requestTimeoutMs
    });
  }
}
