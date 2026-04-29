import { App, Component, MarkdownRenderer, Modal, Notice, setIcon } from "obsidian";
import type { OutputMode } from "../types";
import type { Locale } from "../i18n";

const LABELS: Record<
  Locale,
  {
    append: string;
    cancelled: string;
    close: string;
    copied: string;
    copy: string;
    done: string;
    error: string;
    generating: string;
    insertBelow: string;
    original: string;
    replace: string;
    result: string;
    retry: string;
  }
> = {
  zh: {
    append: "追加",
    cancelled: "已取消",
    close: "关闭",
    copied: "已复制结果",
    copy: "复制",
    done: "完成",
    error: "出错",
    generating: "生成中...",
    insertBelow: "插入下方",
    original: "原文",
    replace: "替换原文",
    result: "结果",
    retry: "重试"
  },
  en: {
    append: "Append",
    cancelled: "Cancelled",
    close: "Close",
    copied: "Copied result",
    copy: "Copy",
    done: "Done",
    error: "Error",
    generating: "Generating...",
    insertBelow: "Insert below",
    original: "Original",
    replace: "Replace",
    result: "Result",
    retry: "Retry"
  }
};

interface ResultModalOptions {
  actionName: string;
  locale: Locale;
  model: string;
  original: string;
  defaultOutput: OutputMode;
  onApply: (mode: OutputMode, result: string) => void;
  onCancel: () => void;
  onRetry: () => void;
}

export class ResultModal extends Modal {
  private result = "";
  private contentElRef!: HTMLDivElement;
  private renderComponent = new Component();
  private statusEl!: HTMLDivElement;
  private complete = false;
  private cancelled = false;
  private renderTimer: number | null = null;
  private renderVersion = 0;

  constructor(app: App, private readonly options: ResultModalOptions) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    this.renderComponent.load();
    this.modalEl.addClass("chisel-result-modal-shell");
    contentEl.empty();
    contentEl.addClass("chisel-result-modal");

    const header = contentEl.createDiv({ cls: "chisel-result-header" });
    header.createEl("h2", { text: `${this.options.actionName} · ${this.options.model}` });
    this.statusEl = header.createDiv({ cls: "chisel-result-status", text: this.labels.generating });

    const body = contentEl.createDiv({ cls: "chisel-result-body" });
    if (this.options.defaultOutput === "diff") {
      const original = body.createDiv({ cls: "chisel-result-pane" });
      original.createEl("h3", { text: this.labels.original });
      original.createEl("pre", { text: this.options.original });
    }

    const resultPane = body.createDiv({ cls: "chisel-result-pane chisel-result-pane-output" });
    resultPane.createEl("h3", { text: this.labels.result });
    this.contentElRef = resultPane.createDiv({ cls: "chisel-result-text" });

    const footer = contentEl.createDiv({ cls: "chisel-result-footer" });
    this.addActionButton(footer, "replace", this.labels.replace, "replace");
    this.addActionButton(footer, "append", this.labels.append, "append");
    this.addActionButton(footer, "insert_below", this.labels.insertBelow, "corner-down-right");

    const copyButton = footer.createEl("button", { cls: "mod-cta" });
    setIcon(copyButton, "copy");
    copyButton.createSpan({ text: this.labels.copy });
    copyButton.addEventListener("click", async () => {
      await navigator.clipboard.writeText(this.result);
      new Notice(this.labels.copied);
    });

    const retryButton = footer.createEl("button");
    setIcon(retryButton, "refresh-cw");
    retryButton.createSpan({ text: this.labels.retry });
    retryButton.addEventListener("click", () => {
      this.close();
      this.options.onRetry();
    });

    const closeButton = footer.createEl("button");
    setIcon(closeButton, "x");
    closeButton.createSpan({ text: this.labels.close });
    closeButton.addEventListener("click", () => this.close());
  }

  appendChunk(chunk: string): void {
    this.result += chunk;
    this.scheduleRender();
  }

  finish(): void {
    this.complete = true;
    this.statusEl.setText(this.labels.done);
    void this.renderMarkdown();
  }

  setError(message: string): void {
    this.complete = true;
    this.statusEl.setText(this.labels.error);
    this.contentElRef.setText(message);
  }

  markCancelled(): void {
    this.cancelled = true;
    this.complete = true;
    if (this.statusEl) {
      this.statusEl.setText(this.labels.cancelled);
    }
  }

  onClose(): void {
    if (!this.complete && !this.cancelled) {
      this.options.onCancel();
    }
    if (this.renderTimer !== null) {
      window.clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
    this.modalEl.removeClass("chisel-result-modal-shell");
    this.renderComponent.unload();
    this.renderComponent = new Component();
    this.contentEl.empty();
  }

  private addActionButton(container: HTMLElement, mode: OutputMode, label: string, iconName: string): void {
    const button = container.createEl("button");
    setIcon(button, iconName);
    button.createSpan({ text: label });
    button.addEventListener("click", () => {
      this.options.onApply(mode, this.result);
      this.close();
    });
  }

  private get labels(): (typeof LABELS)[Locale] {
    return LABELS[this.options.locale];
  }

  private scheduleRender(): void {
    if (this.renderTimer !== null) {
      window.clearTimeout(this.renderTimer);
    }

    this.renderTimer = window.setTimeout(() => {
      this.renderTimer = null;
      void this.renderMarkdown();
    }, 80);
  }

  private async renderMarkdown(): Promise<void> {
    const version = ++this.renderVersion;
    const markdown = this.result || " ";
    this.contentElRef.empty();
    await MarkdownRenderer.render(this.app, markdown, this.contentElRef, "", this.renderComponent);
    if (version !== this.renderVersion) {
      return;
    }
    this.contentElRef.scrollTop = this.contentElRef.scrollHeight;
  }
}
