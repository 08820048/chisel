import { App, Modal, setIcon } from "obsidian";
import type { Locale } from "../i18n";

export const DONATION_URL = "https://ko-fi.com/xuyi";

const LABELS: Record<
  Locale,
  {
    close: string;
    description: string;
    open: string;
    title: string;
  }
> = {
  zh: {
    close: "关闭",
    description: "如果 Chisel 帮你节省了写作、阅读或整理笔记的时间，欢迎通过 Ko-fi 支持这个插件的持续维护。捐赠完全自愿，插件的核心功能会继续保持可用。",
    open: "打开 Ko-fi",
    title: "支持 Chisel"
  },
  en: {
    close: "Close",
    description:
      "If Chisel saves you time while writing, reading, or organizing notes, you can support ongoing maintenance through Ko-fi. Donations are completely optional, and the core plugin will remain usable.",
    open: "Open Ko-fi",
    title: "Support Chisel"
  }
};

export class DonationModal extends Modal {
  constructor(app: App, private readonly locale: Locale) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    const labels = LABELS[this.locale];

    contentEl.empty();
    contentEl.addClass("chisel-donation-modal");

    const header = contentEl.createDiv({ cls: "chisel-donation-header" });
    const icon = header.createSpan({ cls: "chisel-donation-header-icon" });
    setIcon(icon, "heart-handshake");
    header.createEl("h2", { text: labels.title });

    contentEl.createEl("p", { text: labels.description });

    const link = contentEl.createEl("a", {
      cls: "chisel-donation-url",
      href: DONATION_URL,
      text: DONATION_URL
    });
    link.setAttr("target", "_blank");
    link.setAttr("rel", "noopener noreferrer");

    const footer = contentEl.createDiv({ cls: "chisel-donation-footer" });
    const openButton = footer.createEl("button", { cls: "mod-cta" });
    setIcon(openButton, "external-link");
    openButton.createSpan({ text: labels.open });
    openButton.addEventListener("click", () => {
      window.open(DONATION_URL, "_blank", "noopener,noreferrer");
    });

    const closeButton = footer.createEl("button");
    closeButton.createSpan({ text: labels.close });
    closeButton.addEventListener("click", () => this.close());
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
