import { Notice, Plugin, setIcon } from "obsidian";
import { ActionRegistry } from "./actions/ActionRegistry";
import { ActionRunner } from "./core/ActionRunner";
import { SelectionHandler } from "./core/SelectionHandler";
import type { ChiselSettings } from "./types";
import { ProviderManager, createDefaultProviders } from "./providers/ProviderManager";
import { ChiselSettingTab } from "./ui/SettingsTab";
import { SelectionMenu } from "./ui/SelectionMenu";
import { normalizeLanguage } from "./i18n";
import { DonationModal } from "./ui/DonationModal";

const DEFAULT_SETTINGS: ChiselSettings = {
  locale: "zh",
  triggerMode: "immediate",
  defaultProviderId: "openai",
  defaultOutput: "popup",
  requestTimeoutMs: 30000,
  providers: createDefaultProviders(),
  actionPreferences: {},
  customActions: [],
  translation: {
    sourceLanguage: "auto",
    targetLanguage: "Chinese"
  }
};

export default class ChiselPlugin extends Plugin {
  settings!: ChiselSettings;
  providerManager!: ProviderManager;
  actionRegistry!: ActionRegistry;

  private selectionHandler!: SelectionHandler;
  private selectionMenu!: SelectionMenu;
  private actionRunner!: ActionRunner;
  private donationObserver: MutationObserver | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.providerManager = new ProviderManager(() => this.settings);
    this.actionRegistry = new ActionRegistry(() => this.settings);
    this.actionRunner = new ActionRunner(this.app, this.providerManager, () => this.settings);

    this.selectionMenu = new SelectionMenu((action) => {
      const snapshot = this.selectionHandler.readSelection();
      if (!snapshot) {
        new Notice(this.settings.locale === "zh" ? "请先选择文本" : "Select text first");
        return;
      }
      void this.actionRunner.run(action, snapshot.context);
    }, () => (this.settings.locale === "zh" ? "更多动作" : "More actions"));

    this.selectionHandler = new SelectionHandler(
      this,
      () => this.settings,
      (snapshot) => this.selectionMenu.show(snapshot.rect, this.actionRegistry.getVisibleActions()),
      () => this.selectionMenu.hide()
    );
    this.selectionHandler.start();

    this.addSettingTab(new ChiselSettingTab(this.app, this));
    this.registerCommands();
    this.registerDonationButtonInjector();

    this.registerDomEvent(document, "keydown", (event) => {
      if (event.key !== "Escape") return;
      this.selectionMenu.hide();
      this.actionRunner.cancelCurrent();
    });
  }

  onunload(): void {
    this.selectionMenu.destroy();
    this.actionRunner.cancelCurrent();
    this.donationObserver?.disconnect();
  }

  async loadSettings(): Promise<void> {
    const loaded = (await this.loadData()) as Partial<ChiselSettings> | null;
    const mergedProviders = mergeProviders(loaded?.providers ?? []);
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
      locale: loaded?.locale === "en" ? "en" : "zh",
      providers: mergedProviders,
      actionPreferences: loaded?.actionPreferences ?? {},
      customActions: loaded?.customActions ?? [],
      translation: {
        ...DEFAULT_SETTINGS.translation,
        ...loaded?.translation,
        sourceLanguage: normalizeLanguage(loaded?.translation?.sourceLanguage, DEFAULT_SETTINGS.translation.sourceLanguage),
        targetLanguage: normalizeLanguage(loaded?.translation?.targetLanguage, DEFAULT_SETTINGS.translation.targetLanguage)
      }
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private registerCommands(): void {
    this.addCommand({
      id: "open-donation-dialog",
      name: this.settings.locale === "zh" ? "打开 Chisel 捐赠弹窗" : "Open Chisel donation dialog",
      callback: () => this.openDonationModal()
    });

    this.addCommand({
      id: "show-selection-menu",
      name: this.settings.locale === "zh" ? "显示 Chisel 划词菜单" : "Show Chisel selection menu",
      checkCallback: (checking) => {
        const snapshot = this.selectionHandler.readSelection();
        if (!snapshot || !snapshot.context.selection.trim()) return false;
        if (!checking) {
          this.selectionMenu.show(snapshot.rect, this.actionRegistry.getVisibleActions());
        }
        return true;
      }
    });

    for (const action of this.actionRegistry.getAllActions()) {
      this.addCommand({
        id: `run-action-${action.id}`,
        name: `Chisel: ${action.name}`,
        checkCallback: (checking) => {
          const snapshot = this.selectionHandler.readSelection();
          if (!snapshot || !snapshot.context.selection.trim()) return false;
          if (!checking) {
            void this.actionRunner.run(action, snapshot.context);
          }
          return true;
        }
      });
    }
  }

  private openDonationModal(): void {
    new DonationModal(this.app, this.settings.locale).open();
  }

  private registerDonationButtonInjector(): void {
    const inject = () => this.injectDonationButton();
    this.donationObserver = new MutationObserver(inject);
    this.donationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.setTimeout(inject, 300);
  }

  private injectDonationButton(): void {
    const rows = Array.from(
      document.querySelectorAll<HTMLElement>(".setting-item, .community-plugin, .community-plugin-item, .installed-plugin")
    );

    const pluginRow = rows.find((row) => {
      const text = row.textContent ?? "";
      return text.includes("Chisel") && text.includes("Selection-first AI actions");
    });

    if (!pluginRow || pluginRow.querySelector(".chisel-plugin-list-donate-button")) {
      return;
    }

    const controls =
      pluginRow.querySelector<HTMLElement>(".setting-item-control") ??
      pluginRow.querySelector<HTMLElement>(".community-plugin-controls") ??
      pluginRow;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "clickable-icon chisel-plugin-list-donate-button";
    button.setAttr("aria-label", this.settings.locale === "zh" ? "支持 Chisel" : "Support Chisel");
    button.setAttr("title", this.settings.locale === "zh" ? "支持 Chisel" : "Support Chisel");
    setIcon(button, "heart-handshake");
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.openDonationModal();
    });

    controls.append(button);
  }
}

function mergeProviders(loadedProviders: ChiselSettings["providers"]): ChiselSettings["providers"] {
  const defaults = createDefaultProviders();
  const merged = defaults.map((provider) => {
    const loadedProvider = loadedProviders.find((item) => item.id === provider.id);
    return {
      ...provider,
      ...loadedProvider,
      enabled: loadedProvider?.enabled ?? Boolean(loadedProvider?.apiKey?.trim())
    };
  });

  const customProviders = loadedProviders
    .filter((provider) => !defaults.some((item) => item.id === provider.id))
    .map((provider) => ({
      ...provider,
      enabled: provider.enabled ?? Boolean(provider.apiKey?.trim())
    }));
  return [...merged, ...customProviders];
}
