import { Notice, Plugin } from "obsidian";
import { ActionRegistry } from "./actions/ActionRegistry";
import { ActionRunner } from "./core/ActionRunner";
import { SelectionHandler } from "./core/SelectionHandler";
import type { ChiselSettings } from "./types";
import { ProviderManager, createDefaultProviders } from "./providers/ProviderManager";
import { ChiselSettingTab } from "./ui/SettingsTab";
import { SelectionMenu } from "./ui/SelectionMenu";
import { normalizeLanguage } from "./i18n";

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

    this.registerDomEvent(document, "keydown", (event) => {
      if (event.key !== "Escape") return;
      this.selectionMenu.hide();
      this.actionRunner.cancelCurrent();
    });
  }

  onunload(): void {
    this.selectionMenu.destroy();
    this.actionRunner.cancelCurrent();
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
      id: "show-selection-menu",
      name: this.settings.locale === "zh" ? "显示 Chisel 划词菜单" : "Show Chisel selection menu",
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: "A"
        }
      ],
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
}

function mergeProviders(loadedProviders: ChiselSettings["providers"]): ChiselSettings["providers"] {
  const defaults = createDefaultProviders();
  const merged = defaults.map((provider) => ({
    ...provider,
    ...loadedProviders.find((item) => item.id === provider.id)
  }));

  const customProviders = loadedProviders.filter((provider) => !defaults.some((item) => item.id === provider.id));
  return [...merged, ...customProviders];
}
