import { App, Notice } from "obsidian";
import { PromptBuilder } from "./PromptBuilder";
import { EditorWriter } from "./EditorWriter";
import type { ActionContext, ChiselAction, ChiselSettings, OutputMode } from "../types";
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
    const providerConfig = this.providerManager.getProviderConfig(providerId);
    const locale = settings.locale;

    if (!providerConfig.apiKey && providerConfig.type !== "custom") {
      new Notice(
        locale === "zh"
          ? `请先在 Chisel 设置中配置 ${providerConfig.name} API Key`
          : `Configure the ${providerConfig.name} API key in Chisel settings first`
      );
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), settings.requestTimeoutMs);
    const request: RunningRequest = { controller, timeoutId };
    this.running = request;

    const messages = this.promptBuilder.build(action, context);
    const provider = this.providerManager.getProvider(providerConfig.id);
    const output = action.output || settings.defaultOutput;
    const stream = provider.complete(messages, {
      stream: true,
      signal: controller.signal,
      model: action.model,
      timeoutMs: settings.requestTimeoutMs
    });

    try {
      if (output === "popup" || output === "diff") {
        await this.runInModal(action, context, providerConfig.model, output, stream, request);
      } else {
        new Notice(locale === "zh" ? `${action.name}生成中，按 Esc 可取消` : `${action.name} is generating. Press Esc to cancel.`);
        await this.writer.streamResult(context.editor, context.range, stream, output, controller.signal);
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
    model: string,
    output: OutputMode,
    stream: AsyncIterable<string>,
    request: RunningRequest
  ): Promise<void> {
    const modal = new ResultModal(this.app, {
      actionName: action.name,
      locale: this.getSettings().locale,
      model,
      original: context.selection,
      defaultOutput: output,
      onApply: (mode, result) => this.writer.applyResult(context.editor, context.range, result, mode),
      onCancel: () => this.cancelCurrent(),
      onRetry: () => void this.run(action, context)
    });
    request.modal = modal;
    modal.open();

    for await (const chunk of stream) {
      if (request.controller.signal.aborted) break;
      modal.appendChunk(chunk);
    }

    modal.finish();
  }
}
