import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type ChiselPlugin from "../main";
import type { CustomActionConfig, OutputMode, ProviderConfig, TriggerMode } from "../types";
import { LANGUAGE_OPTIONS, LOCALE_OPTIONS, type Locale, languageLabel, normalizeLanguage, t } from "../i18n";

const OUTPUT_OPTIONS: Record<Locale, Record<OutputMode, string>> = {
  zh: {
    popup: "弹窗展示",
    replace: "替换原文",
    append: "追加到原文后",
    insert_below: "插入当前段落下方",
    diff: "对比弹窗"
  },
  en: {
    popup: "Popup",
    replace: "Replace selection",
    append: "Append after selection",
    insert_below: "Insert below paragraph",
    diff: "Diff popup"
  }
};

const TRIGGER_OPTIONS: Record<Locale, Record<TriggerMode, string>> = {
  zh: {
    immediate: "选中即触发",
    hotkey: "快捷键触发"
  },
  en: {
    immediate: "Show after selection",
    hotkey: "Show by hotkey"
  }
};

export class ChiselSettingTab extends PluginSettingTab {
  private importExportValue = "";

  constructor(app: App, private readonly plugin: ChiselPlugin) {
    super(app, plugin);
  }

  private get locale(): Locale {
    return this.plugin.settings.locale;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("chisel-settings");

    containerEl.createEl("h2", { text: "Chisel" });
    this.renderGeneral(containerEl);
    this.renderProviders(containerEl);
    this.renderMenuConfig(containerEl);
    this.renderCustomActions(containerEl);
    this.renderTranslation(containerEl);
  }

  private renderGeneral(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: t(this.locale, "general.title") });

    new Setting(containerEl)
      .setName(t(this.locale, "general.language"))
      .addDropdown((dropdown) => {
        for (const locale of LOCALE_OPTIONS) {
          dropdown.addOption(locale.value, locale.label);
        }
        dropdown.setValue(this.plugin.settings.locale);
        dropdown.onChange(async (value) => {
          this.plugin.settings.locale = value as Locale;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    new Setting(containerEl)
      .setName(t(this.locale, "general.triggerMode"))
      .setDesc(t(this.locale, "general.triggerModeDesc"))
      .addDropdown((dropdown) => {
        Object.entries(TRIGGER_OPTIONS[this.locale]).forEach(([value, label]) => dropdown.addOption(value, label));
        dropdown.setValue(this.plugin.settings.triggerMode);
        dropdown.onChange(async (value) => {
          this.plugin.settings.triggerMode = value as TriggerMode;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t(this.locale, "general.defaultProvider"))
      .addDropdown((dropdown) => {
        this.plugin.settings.providers.forEach((provider) => dropdown.addOption(provider.id, provider.name));
        dropdown.setValue(this.plugin.settings.defaultProviderId);
        dropdown.onChange(async (value) => {
          this.plugin.settings.defaultProviderId = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t(this.locale, "general.defaultOutput"))
      .addDropdown((dropdown) => {
        this.addOutputOptions(dropdown);
        dropdown.setValue(this.plugin.settings.defaultOutput);
        dropdown.onChange(async (value) => {
          this.plugin.settings.defaultOutput = value as OutputMode;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t(this.locale, "general.requestTimeout"))
      .setDesc(t(this.locale, "general.requestTimeoutDesc"))
      .addText((text) => {
        text.inputEl.type = "number";
        text.setValue(String(Math.round(this.plugin.settings.requestTimeoutMs / 1000)));
        text.onChange(async (value) => {
          const seconds = Math.max(5, Number(value) || 30);
          this.plugin.settings.requestTimeoutMs = seconds * 1000;
          await this.plugin.saveSettings();
        });
      });
  }

  private renderProviders(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: t(this.locale, "provider.title") });

    for (const provider of this.plugin.settings.providers) {
      const details = containerEl.createEl("details", { cls: "chisel-provider" });
      details.createEl("summary", { text: provider.name });

      new Setting(details)
        .setName(t(this.locale, "provider.name"))
        .addText((text) =>
          text.setValue(provider.name).onChange(async (value) => {
            provider.name = value || provider.name;
            await this.plugin.saveSettings();
          })
        );

      new Setting(details)
        .setName(t(this.locale, "provider.baseUrl"))
        .addText((text) =>
          text.setValue(provider.baseURL).onChange(async (value) => {
            provider.baseURL = value.trim();
            provider.models = [];
            provider.modelsFetchedAt = undefined;
            await this.plugin.saveSettings();
          })
        );

      const previousApiKey = provider.apiKey;
      new Setting(details)
        .setName(t(this.locale, "provider.apiKey"))
        .addText((text) => {
          text.inputEl.type = "password";
          text.setPlaceholder(
            provider.type === "custom" ? t(this.locale, "provider.placeholderOptional") : t(this.locale, "provider.placeholderRequired")
          );
          text.setValue(provider.apiKey);
          text.onChange(async (value) => {
            provider.apiKey = value;
            provider.models = [];
            provider.modelsFetchedAt = undefined;
            await this.plugin.saveSettings();
          });
          text.inputEl.addEventListener("blur", () => {
            if (provider.apiKey && provider.apiKey !== previousApiKey) {
              void this.fetchProviderModels(provider);
            }
          });
        });

      new Setting(details)
        .setName(t(this.locale, "model.current"))
        .setDesc(t(this.locale, "model.currentDesc"))
        .addText((text) =>
          text.setValue(provider.model).onChange(async (value) => {
            provider.model = value.trim();
            await this.plugin.saveSettings();
          })
        );

      new Setting(details)
        .setName(t(this.locale, "model.list"))
        .setDesc(this.modelListDescription(provider))
        .addDropdown((dropdown) => {
          const models = provider.models ?? [];
          if (models.length === 0) {
            dropdown.addOption(provider.model, provider.model || t(this.locale, "common.notFetched"));
            dropdown.setDisabled(true);
          } else {
            for (const model of models) {
              dropdown.addOption(model, model);
            }
            if (provider.model && !models.includes(provider.model)) {
              dropdown.addOption(provider.model, `${provider.model} (${t(this.locale, "common.manual")})`);
            }
            dropdown.setValue(provider.model);
          }
          dropdown.onChange(async (value) => {
            provider.model = value;
            await this.plugin.saveSettings();
            this.display();
          });
        })
        .addButton((button) =>
          button.setButtonText(t(this.locale, "model.fetch")).onClick(async () => {
            await this.fetchProviderModels(provider);
          })
        );

      new Setting(details)
        .setName(t(this.locale, "provider.connection"))
        .addButton((button) =>
          button.setButtonText(t(this.locale, "provider.test")).onClick(async () => {
            await this.testProvider(provider);
          })
        )
        .addButton((button) => {
          button.setButtonText(t(this.locale, "provider.delete"));
          button.setDisabled(provider.type !== "custom");
          button.onClick(async () => {
            this.plugin.settings.providers = this.plugin.settings.providers.filter((item) => item.id !== provider.id);
            if (this.plugin.settings.defaultProviderId === provider.id) {
              this.plugin.settings.defaultProviderId = "openai";
            }
            await this.plugin.saveSettings();
            this.display();
          });
        });
    }

    new Setting(containerEl)
      .setName(t(this.locale, "provider.add"))
      .setDesc(t(this.locale, "provider.addDesc"))
      .addButton((button) =>
        button.setButtonText(t(this.locale, "provider.add")).setCta().onClick(async () => {
          this.plugin.settings.providers.push({
            id: `custom-${Date.now()}`,
            name: "My Local Model",
            type: "custom",
            baseURL: "http://localhost:11434/v1",
            apiKey: "",
            model: "llama3.2"
          });
          await this.plugin.saveSettings();
          this.display();
        })
      );
  }

  private renderMenuConfig(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: t(this.locale, "menuConfig.title") });

    for (const action of this.plugin.actionRegistry.getAllActions()) {
      new Setting(containerEl)
        .setName(action.name)
        .setDesc(action.builtin ? t(this.locale, "menuConfig.builtin") : t(this.locale, "menuConfig.custom"))
        .addToggle((toggle) =>
          toggle.setValue(action.visible).onChange(async (value) => {
            if (action.builtin) {
              this.plugin.settings.actionPreferences[action.id] = {
                ...this.plugin.settings.actionPreferences[action.id],
                visible: value,
                order: action.order
              };
            } else {
              const custom = this.plugin.settings.customActions.find((item) => item.id === action.id);
              if (custom) custom.visible = value;
            }
            await this.plugin.saveSettings();
            this.display();
          })
        )
        .addDropdown((dropdown) => {
          this.addOutputOptions(dropdown);
          dropdown.setValue(action.output);
          dropdown.onChange(async (value) => {
            if (action.builtin) {
              this.plugin.settings.actionPreferences[action.id] = {
                ...this.plugin.settings.actionPreferences[action.id],
                visible: action.visible,
                order: action.order,
                output: value as OutputMode
              };
            } else {
              const custom = this.plugin.settings.customActions.find((item) => item.id === action.id);
              if (custom) custom.output = value as OutputMode;
            }
            await this.plugin.saveSettings();
          });
        })
        .addDropdown((dropdown) => {
          dropdown.addOption("", t(this.locale, "common.defaultProvider"));
          this.plugin.settings.providers.forEach((provider) => dropdown.addOption(provider.id, provider.name));
          dropdown.setValue(action.providerId ?? "");
          dropdown.onChange(async (value) => {
            const providerId = value || undefined;
            if (action.builtin) {
              this.plugin.settings.actionPreferences[action.id] = {
                ...this.plugin.settings.actionPreferences[action.id],
                visible: action.visible,
                order: action.order,
                providerId
              };
            } else {
              const custom = this.plugin.settings.customActions.find((item) => item.id === action.id);
              if (custom) custom.providerId = providerId;
            }
            await this.plugin.saveSettings();
          });
        })
        .addExtraButton((button) =>
          button.setIcon("arrow-up").setTooltip(this.locale === "zh" ? "上移" : "Move up").onClick(async () => {
            await this.moveAction(action.id, -1);
          })
        )
        .addExtraButton((button) =>
          button.setIcon("arrow-down").setTooltip(this.locale === "zh" ? "下移" : "Move down").onClick(async () => {
            await this.moveAction(action.id, 1);
          })
        );
    }
  }

  private renderCustomActions(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: t(this.locale, "settings.customActions") });

    for (const action of this.plugin.settings.customActions) {
      const details = containerEl.createEl("details", { cls: "chisel-custom-action" });
      details.createEl("summary", { text: action.name });

      new Setting(details)
        .setName(t(this.locale, "provider.name"))
        .addText((text) =>
          text.setValue(action.name).onChange(async (value) => {
            action.name = value || action.name;
            await this.plugin.saveSettings();
          })
        );

      new Setting(details)
        .setName(t(this.locale, "settings.icon"))
        .setDesc(t(this.locale, "settings.iconDesc"))
        .addText((text) =>
          text.setValue(action.icon).onChange(async (value) => {
            action.icon = value || "sparkles";
            await this.plugin.saveSettings();
          })
        );

      new Setting(details)
        .setName(t(this.locale, "settings.outputMode"))
        .addDropdown((dropdown) => {
          this.addOutputOptions(dropdown);
          dropdown.setValue(action.output);
          dropdown.onChange(async (value) => {
            action.output = value as OutputMode;
            await this.plugin.saveSettings();
          });
        });

      new Setting(details)
        .setName(t(this.locale, "settings.prompt"))
        .setDesc(t(this.locale, "settings.promptDesc"))
        .addTextArea((text) => {
          text.inputEl.rows = 8;
          text.inputEl.addClass("chisel-prompt-textarea");
          text.setValue(action.prompt);
          text.onChange(async (value) => {
            action.prompt = value;
            await this.plugin.saveSettings();
          });
        });

      new Setting(details).addButton((button) =>
        button.setButtonText(t(this.locale, "settings.removeAction")).onClick(async () => {
          this.plugin.settings.customActions = this.plugin.settings.customActions.filter((item) => item.id !== action.id);
          await this.plugin.saveSettings();
          this.display();
        })
      );
    }

    new Setting(containerEl)
      .setName(t(this.locale, "settings.newCustomAction"))
      .addButton((button) =>
        button.setButtonText(t(this.locale, "settings.newAction")).setCta().onClick(async () => {
          this.plugin.settings.customActions.push(this.createCustomAction());
          await this.plugin.saveSettings();
          this.display();
        })
      );

    new Setting(containerEl)
      .setName(t(this.locale, "importExport.title"))
      .setDesc(t(this.locale, "importExport.desc"))
      .addButton((button) =>
        button.setButtonText(t(this.locale, "importExport.export")).onClick(async () => {
          this.importExportValue = JSON.stringify(this.plugin.settings.customActions, null, 2);
          await navigator.clipboard.writeText(this.importExportValue);
          new Notice(this.locale === "zh" ? "已导出并复制到剪贴板" : "Exported and copied to clipboard");
          this.display();
        })
      )
      .addButton((button) =>
        button.setButtonText(t(this.locale, "importExport.import")).onClick(async () => {
          await this.importCustomActions();
        })
      );

    new Setting(containerEl).addTextArea((text) => {
      text.inputEl.rows = 8;
      text.inputEl.addClass("chisel-import-export");
      text.setValue(this.importExportValue);
      text.onChange((value) => {
        this.importExportValue = value;
      });
    });
  }

  private renderTranslation(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: t(this.locale, "translation.title") });

    new Setting(containerEl)
      .setName(t(this.locale, "translation.source"))
      .addDropdown((dropdown) => {
        for (const option of LANGUAGE_OPTIONS) {
          dropdown.addOption(option.value, languageLabel(this.locale, option.value));
        }
        dropdown.setValue(normalizeLanguage(this.plugin.settings.translation.sourceLanguage, "auto"));
        dropdown.onChange(async (value) => {
          this.plugin.settings.translation.sourceLanguage = value || "auto";
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t(this.locale, "translation.target"))
      .addDropdown((dropdown) => {
        for (const option of LANGUAGE_OPTIONS.filter((item) => item.value !== "auto")) {
          dropdown.addOption(option.value, languageLabel(this.locale, option.value));
        }
        dropdown.setValue(normalizeLanguage(this.plugin.settings.translation.targetLanguage, "Chinese"));
        dropdown.onChange(async (value) => {
          this.plugin.settings.translation.targetLanguage = value || "Chinese";
          await this.plugin.saveSettings();
        });
      });
  }

  private addOutputOptions(dropdown: { addOption(value: string, display: string): unknown }): void {
    Object.entries(OUTPUT_OPTIONS[this.locale]).forEach(([value, label]) => dropdown.addOption(value, label));
  }

  private async moveAction(actionId: string, direction: -1 | 1): Promise<void> {
    const actions = this.plugin.actionRegistry.getAllActions();
    const index = actions.findIndex((action) => action.id === actionId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= actions.length) return;

    const currentAction = actions[index];
    const targetAction = actions[target];
    const currentOrder = currentAction.order;
    this.setActionOrder(currentAction.id, targetAction.order);
    this.setActionOrder(targetAction.id, currentOrder);
    await this.plugin.saveSettings();
    this.display();
  }

  private setActionOrder(actionId: string, order: number): void {
    const custom = this.plugin.settings.customActions.find((action) => action.id === actionId);
    if (custom) {
      custom.order = order;
      return;
    }

    this.plugin.settings.actionPreferences[actionId] = {
      ...this.plugin.settings.actionPreferences[actionId],
      order,
      visible: this.plugin.actionRegistry.getAction(actionId)?.visible ?? true
    };
  }

  private createCustomAction(): CustomActionConfig {
    return {
      id: `custom-${Date.now()}`,
      name: this.locale === "zh" ? "新动作" : "New action",
      icon: "sparkles",
      prompt: this.locale === "zh" ? "请处理以下内容：\n\n{{selection}}" : "Process the following text:\n\n{{selection}}",
      output: "popup",
      visible: true,
      order: 1000 + this.plugin.settings.customActions.length * 10
    };
  }

  private async importCustomActions(): Promise<void> {
    try {
      const parsed = JSON.parse(this.importExportValue) as unknown;
      const actions = Array.isArray(parsed)
        ? parsed
        : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { customActions?: unknown }).customActions)
          ? (parsed as { customActions: unknown[] }).customActions
          : null;

      if (!actions) {
        throw new Error(
          this.locale === "zh" ? "JSON 必须是动作数组，或包含 customActions 数组。" : "JSON must be an action array or contain a customActions array."
        );
      }

      this.plugin.settings.customActions = actions.map((action, index) => ({
        id: String((action as Partial<CustomActionConfig>).id || `custom-${Date.now()}-${index}`),
        name: String((action as Partial<CustomActionConfig>).name || (this.locale === "zh" ? "自定义动作" : "Custom action")),
        icon: String((action as Partial<CustomActionConfig>).icon || "sparkles"),
        prompt: String((action as Partial<CustomActionConfig>).prompt || "{{selection}}"),
        output: ((action as Partial<CustomActionConfig>).output || "popup") as OutputMode,
        providerId: (action as Partial<CustomActionConfig>).providerId,
        model: (action as Partial<CustomActionConfig>).model,
        visible: (action as Partial<CustomActionConfig>).visible ?? true,
        order: (action as Partial<CustomActionConfig>).order ?? 1000 + index * 10,
        hotkey: (action as Partial<CustomActionConfig>).hotkey
      }));

      await this.plugin.saveSettings();
      new Notice(this.locale === "zh" ? "自定义动作已导入" : "Custom actions imported");
      this.display();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error));
    }
  }

  private async testProvider(provider: ProviderConfig): Promise<void> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      await this.plugin.providerManager.getProvider(provider.id).testConnection(controller.signal);
      new Notice(this.locale === "zh" ? `${provider.name} 连接成功` : `${provider.name} connected`);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error));
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private async fetchProviderModels(provider: ProviderConfig): Promise<void> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const models = await this.plugin.providerManager.getProvider(provider.id).listModels(controller.signal);
      if (models.length === 0) {
        throw new Error(this.locale === "zh" ? "接口返回了空模型列表" : "The API returned an empty model list");
      }

      provider.models = models;
      provider.modelsFetchedAt = new Date().toISOString();
      if (!provider.model || !models.includes(provider.model)) {
        provider.model = models[0];
      }
      await this.plugin.saveSettings();
      new Notice(this.locale === "zh" ? `已拉取 ${models.length} 个模型` : `Fetched ${models.length} models`);
      this.display();
    } catch (error) {
      new Notice(
        this.locale === "zh"
          ? `拉取模型失败：${error instanceof Error ? error.message : String(error)}`
          : `Failed to fetch models: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private modelListDescription(provider: ProviderConfig): string {
    const count = provider.models?.length ?? 0;
    if (count === 0) {
      return t(this.locale, "model.listEmpty");
    }

    const fetchedAt = provider.modelsFetchedAt ? new Date(provider.modelsFetchedAt).toLocaleString() : this.locale === "zh" ? "未知时间" : "unknown";
    return this.locale === "zh" ? `已缓存 ${count} 个模型，更新时间：${fetchedAt}` : `${count} models cached. Updated: ${fetchedAt}`;
  }
}
