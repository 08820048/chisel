import { App, Notice, PluginSettingTab, Setting, setIcon } from "obsidian";
import type ChiselPlugin from "../main";
import type { CustomActionConfig, OutputMode, ProviderConfig, TriggerMode } from "../types";
import { LANGUAGE_OPTIONS, LOCALE_OPTIONS, type Locale, languageLabel, normalizeLanguage, t } from "../i18n";
import { getProviderLogo } from "./providerLogos";

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
  private selectedProviderId = "";

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

    this.renderGeneral(containerEl);
    this.renderProviders(containerEl);
    this.renderMenuConfig(containerEl);
    this.renderCustomActions(containerEl);
    this.renderTranslation(containerEl);
  }

  private renderGeneral(containerEl: HTMLElement): void {
    this.addHeading(containerEl, t(this.locale, "general.title"));

    new Setting(containerEl)
      .setName(t(this.locale, "general.language"))
      .addDropdown((dropdown) => {
        for (const locale of LOCALE_OPTIONS) {
          dropdown.addOption(locale.value, locale.label);
        }
        dropdown.setValue(this.plugin.settings.locale);
        dropdown.onChange((value) => {
          this.runAsync(async () => {
            this.plugin.settings.locale = this.normalizeLocale(value);
            await this.plugin.saveSettings();
            this.display();
          });
        });
      });

    new Setting(containerEl)
      .setName(t(this.locale, "general.triggerMode"))
      .setDesc(t(this.locale, "general.triggerModeDesc"))
      .addDropdown((dropdown) => {
        Object.entries(TRIGGER_OPTIONS[this.locale]).forEach(([value, label]) => {
          dropdown.addOption(value, label);
        });
        dropdown.setValue(this.plugin.settings.triggerMode);
        dropdown.onChange((value) => {
          this.runAsync(async () => {
            this.plugin.settings.triggerMode = this.normalizeTriggerMode(value);
            await this.plugin.saveSettings();
          });
        });
      });

    new Setting(containerEl)
      .setName(t(this.locale, "general.defaultProvider"))
      .addDropdown((dropdown) => {
        this.plugin.settings.providers.forEach((provider) => {
          dropdown.addOption(provider.id, provider.name);
        });
        dropdown.setValue(this.plugin.settings.defaultProviderId);
        dropdown.onChange((value) => {
          this.runAsync(async () => {
            this.plugin.settings.defaultProviderId = value;
            await this.plugin.saveSettings();
          });
        });
      });

    new Setting(containerEl)
      .setName(t(this.locale, "general.defaultOutput"))
      .addDropdown((dropdown) => {
        this.addOutputOptions(dropdown);
        dropdown.setValue(this.plugin.settings.defaultOutput);
        dropdown.onChange((value) => {
          this.runAsync(async () => {
            this.plugin.settings.defaultOutput = this.normalizeOutputMode(value);
            await this.plugin.saveSettings();
          });
        });
      });

    new Setting(containerEl)
      .setName(t(this.locale, "general.requestTimeout"))
      .setDesc(t(this.locale, "general.requestTimeoutDesc"))
      .addText((text) => {
        text.inputEl.type = "number";
        text.setValue(String(Math.round(this.plugin.settings.requestTimeoutMs / 1000)));
        text.onChange((value) => {
          this.runAsync(async () => {
            const seconds = Math.max(5, Number(value) || 30);
            this.plugin.settings.requestTimeoutMs = seconds * 1000;
            await this.plugin.saveSettings();
          });
        });
      });
  }

  private renderProviders(containerEl: HTMLElement): void {
    this.addHeading(containerEl, t(this.locale, "provider.title"));

    const providers = this.plugin.settings.providers;
    if (!providers.some((provider) => provider.id === this.selectedProviderId)) {
      this.selectedProviderId = this.plugin.settings.defaultProviderId || providers[0]?.id || "";
    }

    const selectedProvider = providers.find((provider) => provider.id === this.selectedProviderId) ?? providers[0];
    if (!selectedProvider) return;

    const manager = containerEl.createDiv({ cls: "chisel-provider-manager" });
    const toolbar = manager.createDiv({ cls: "chisel-provider-toolbar" });
    toolbar.createDiv({ cls: "chisel-provider-toolbar-spacer" });

    const addButton = toolbar.createEl("button", { cls: "mod-cta chisel-provider-add-button" });
    setIcon(addButton, "plus");
    addButton.createSpan({ text: this.locale === "zh" ? "添加自定义提供商" : "Add Custom Provider" });
    addButton.addEventListener("click", () => {
      this.runAsync(async () => {
        const provider = this.createCustomProvider();
        this.plugin.settings.providers.push(provider);
        this.selectedProviderId = provider.id;
        await this.plugin.saveSettings();
        this.display();
      });
    });

    const body = manager.createDiv({ cls: "chisel-provider-body" });
    const list = body.createDiv({ cls: "chisel-provider-list" });
    for (const provider of providers) {
      list.append(this.createProviderListItem(provider));
    }

    const panel = body.createDiv({ cls: "chisel-provider-panel" });
    this.renderProviderPanel(panel, selectedProvider);
  }

  private createProviderListItem(provider: ProviderConfig): HTMLElement {
    const isSelected = provider.id === this.selectedProviderId;
    const isDefault = provider.id === this.plugin.settings.defaultProviderId;
    const item = document.createElement("button");
    item.type = "button";
    item.className = `chisel-provider-list-item${isSelected ? " is-selected" : ""}`;

    const icon = item.createSpan({ cls: "chisel-provider-list-icon" });
    this.renderProviderLogo(icon, provider);

    const text = item.createSpan({ cls: "chisel-provider-list-name", text: provider.name });

    if (provider.type === "custom") {
      text.createSpan({ cls: "chisel-provider-custom-badge", text: "CUSTOM" });
    }

    item.createSpan({
      cls: `chisel-provider-status-dot${this.plugin.providerManager.hasProviderCredential(provider) ? " is-configured" : ""}`
    });
    if (isDefault) {
      item.setAttr("aria-label", `${provider.name} (${t(this.locale, "general.defaultProvider")})`);
    }

    item.addEventListener("click", () => {
      this.selectedProviderId = provider.id;
      this.display();
    });

    return item;
  }

  private renderProviderPanel(container: HTMLElement, provider: ProviderConfig): void {
    const header = container.createDiv({ cls: "chisel-provider-panel-header" });
    const headerLogo = header.createDiv({ cls: "chisel-provider-panel-logo" });
    this.renderProviderLogo(headerLogo, provider);
    const titleWrap = header.createDiv({ cls: "chisel-provider-title-wrap" });
    titleWrap.createDiv({ cls: "chisel-provider-title", text: provider.name });
    titleWrap.createDiv({ cls: "chisel-provider-subtitle", text: this.providerDescription(provider) });

    const headerActions = header.createDiv({ cls: "chisel-provider-header-actions" });
    const testButton = headerActions.createEl("button", { cls: "clickable-icon" });
    testButton.setAttr("aria-label", t(this.locale, "provider.test"));
    testButton.setAttr("title", t(this.locale, "provider.test"));
    setIcon(testButton, "zap");
    testButton.addEventListener("click", () => void this.testProvider(provider));

    const enabledLabel = headerActions.createEl("label", { cls: "chisel-provider-default-toggle" });
    enabledLabel.setAttr("title", this.locale === "zh" ? "启用 Provider" : "Enable provider");
    const enabledInput = enabledLabel.createEl("input", { attr: { type: "checkbox" } });
    enabledInput.checked = Boolean(provider.enabled);
    enabledInput.addEventListener("change", () => {
      this.runAsync(async () => {
        if (enabledInput.checked && !this.plugin.providerManager.hasProviderCredential(provider)) {
          new Notice(this.locale === "zh" ? "请先配置 API Key 后再启用该模型提供商" : "Configure the API key before enabling this provider");
          enabledInput.checked = false;
          return;
        }

        provider.enabled = enabledInput.checked;
        await this.plugin.saveSettings();
        this.display();
      });
    });
    enabledLabel.createSpan({ cls: "chisel-provider-switch" });

    if (provider.type === "custom") {
      this.createProviderField(container, {
        label: t(this.locale, "provider.name"),
        value: provider.name,
        onChange: (value) => {
          provider.name = value || provider.name;
          this.runAsync(() => this.plugin.saveSettings());
        }
      });
    } else {
      this.createReadonlyProviderField(container, t(this.locale, "provider.name"), provider.name);
    }

    const previousApiKey = provider.apiKey;
    this.createProviderField(container, {
      label: t(this.locale, "provider.apiKey"),
      placeholder: provider.type === "custom" ? t(this.locale, "provider.placeholderOptional") : t(this.locale, "provider.placeholderRequired"),
      type: "password",
      value: provider.apiKey,
      helper: this.locale === "zh" ? "API Key 仅保存在本地插件数据中" : "API keys are stored locally in plugin data",
      rightIcon: "eye",
      onChange: (value) => {
        provider.apiKey = value;
        if (!value.trim()) {
          provider.enabled = false;
        }
        provider.models = [];
        provider.modelsFetchedAt = undefined;
        this.runAsync(() => this.plugin.saveSettings());
      },
      onBlur: () => {
        if (provider.apiKey && provider.apiKey !== previousApiKey) {
          void this.fetchProviderModels(provider);
        }
      }
    });

    if (provider.type === "custom") {
      this.createProviderField(container, {
        label: t(this.locale, "provider.baseUrl"),
        value: provider.baseURL,
        helper: t(this.locale, "provider.addDesc"),
        onChange: (value) => {
          provider.baseURL = value.trim();
          provider.models = [];
          provider.modelsFetchedAt = undefined;
          this.runAsync(() => this.plugin.saveSettings());
        }
      });
    } else {
      this.createReadonlyProviderField(
        container,
        t(this.locale, "provider.baseUrl"),
        provider.baseURL,
        this.locale === "zh" ? "内置提供商的 API 端点由插件维护" : "Built-in provider API endpoints are managed by the plugin"
      );
    }

    const modelSection = container.createDiv({ cls: "chisel-provider-field" });
    modelSection.createEl("label", { text: t(this.locale, "model.current") });
    const modelRow = modelSection.createDiv({ cls: "chisel-provider-model-row" });
    const models = provider.models ?? [];
    if (models.length > 0) {
      const select = modelRow.createEl("select");
      for (const model of models) {
        select.createEl("option", { value: model, text: model });
      }
      if (provider.model && !models.includes(provider.model)) {
        select.createEl("option", { value: provider.model, text: `${provider.model} (${t(this.locale, "common.manual")})` });
      }
      select.value = provider.model;
      select.addEventListener("change", () => {
        this.runAsync(async () => {
          provider.model = select.value;
          await this.plugin.saveSettings();
        });
      });
    } else {
      const input = modelRow.createEl("input", {
        attr: { type: "text", placeholder: t(this.locale, "common.notFetched") },
        value: provider.model
      });
      input.addEventListener("change", () => {
        this.runAsync(async () => {
          provider.model = input.value.trim();
          await this.plugin.saveSettings();
        });
      });
    }

    const fetchButton = modelRow.createEl("button");
    fetchButton.createSpan({ text: t(this.locale, "model.fetch") });
    fetchButton.addEventListener("click", () => void this.fetchProviderModels(provider));
    modelSection.createDiv({ cls: "chisel-provider-helper", text: this.modelListDescription(provider) });

    const footer = container.createDiv({ cls: "chisel-provider-panel-footer" });
    if (provider.type === "custom") {
      const deleteButton = footer.createEl("button");
      setIcon(deleteButton, "trash-2");
      deleteButton.createSpan({ text: t(this.locale, "provider.delete") });
      deleteButton.addEventListener("click", () => {
        this.runAsync(async () => {
          this.plugin.settings.providers = this.plugin.settings.providers.filter((item) => item.id !== provider.id);
          if (this.plugin.settings.defaultProviderId === provider.id) {
            this.plugin.settings.defaultProviderId = this.plugin.settings.providers[0]?.id ?? "openai";
          }
          this.selectedProviderId = this.plugin.settings.defaultProviderId;
          await this.plugin.saveSettings();
          this.display();
        });
      });
    }
  }

  private createProviderField(
    container: HTMLElement,
    options: {
      helper?: string;
      label: string;
      onBlur?: () => void;
      onChange: (value: string) => void;
      placeholder?: string;
      rightIcon?: string;
      type?: string;
      value: string;
    }
  ): void {
    const field = container.createDiv({ cls: "chisel-provider-field" });
    field.createEl("label", { text: options.label });
    const inputWrap = field.createDiv({ cls: "chisel-provider-input-wrap" });
    const input = inputWrap.createEl("input", {
      attr: {
        placeholder: options.placeholder ?? "",
        type: options.type ?? "text"
      },
      value: options.value
    });

    input.addEventListener("change", () => options.onChange(input.value));
    input.addEventListener("blur", () => options.onBlur?.());

    if (options.rightIcon) {
      const iconButton = inputWrap.createEl("button", { cls: "clickable-icon chisel-provider-input-icon" });
      iconButton.type = "button";
      setIcon(iconButton, options.rightIcon);
      iconButton.addEventListener("click", () => {
        if (input.type === "password") {
          input.type = "text";
          setIcon(iconButton, "eye-off");
        } else {
          input.type = options.type ?? "text";
          setIcon(iconButton, options.rightIcon ?? "eye");
        }
      });
    }

    if (options.helper) {
      field.createDiv({ cls: "chisel-provider-helper", text: options.helper });
    }
  }

  private createReadonlyProviderField(container: HTMLElement, label: string, value: string, helper?: string): void {
    const field = container.createDiv({ cls: "chisel-provider-field" });
    field.createEl("label", { text: label });
    field.createDiv({ cls: "chisel-provider-readonly-value", text: value });

    if (helper) {
      field.createDiv({ cls: "chisel-provider-helper", text: helper });
    }
  }

  private createCustomProvider(): ProviderConfig {
    return {
      id: `custom-${Date.now()}`,
      name: "My Local Model",
      type: "custom",
      baseURL: "http://localhost:11434/v1",
      apiKey: "",
      model: "llama3.2",
      enabled: false
    };
  }

  private providerDescription(provider: ProviderConfig): string {
    if (provider.type === "custom") {
      return this.locale === "zh" ? "OpenAI 兼容协议的自定义模型服务" : "Custom OpenAI-compatible model service";
    }

    const descriptions: Record<string, string> = {
      anthropic: "Claude models including Sonnet and Opus",
      deepseek: "DeepSeek chat and reasoning models",
      gemini: "Gemini models through the OpenAI-compatible API",
      minimax: "MiniMax Token Plan models including MiniMax-M2.7",
      openai: "OpenAI models including GPT-5, o3, and GPT-4o",
      xiaomimimo: "Xiaomi MiMo OpenAI-compatible models including MiMo-V2.5-Pro",
      zai: "Z.ai OpenAI-compatible models including GLM-5.1"
    };

    return descriptions[provider.id] ?? `${provider.name} models`;
  }

  private providerIcon(provider: ProviderConfig): string {
    const icons: Record<string, string> = {
      anthropic: "sparkles",
      deepseek: "waves",
      gemini: "diamond",
      minimax: "activity",
      openai: "bot",
      xiaomimimo: "sparkles",
      zai: "sparkles"
    };

    return icons[provider.id] ?? (provider.type === "custom" ? "blocks" : "cpu");
  }

  private renderProviderLogo(container: HTMLElement, provider: ProviderConfig): void {
    const logo = getProviderLogo(this.providerLogoId(provider));
    if (logo) {
      const svg = new DOMParser().parseFromString(logo, "image/svg+xml").documentElement;
      if (svg instanceof SVGElement) {
        container.empty();
        container.append(document.importNode(svg, true));
        return;
      }
    }

    setIcon(container, this.providerIcon(provider));
  }

  private providerLogoId(provider: ProviderConfig): string {
    if (provider.id === "anthropic") {
      return "claude";
    }

    const candidate = `${provider.id} ${provider.name} ${provider.baseURL}`.toLowerCase();
    if (candidate.includes("ollama")) return "ollama";
    if (candidate.includes("deepseek")) return "deepseek";
    if (candidate.includes("minimax") || candidate.includes("mini max")) return "minimax";
    if (candidate.includes("xiaomimimo") || candidate.includes("xiaomi") || candidate.includes("mimo")) return "xiaomimimo";
    if (candidate.includes("z.ai") || candidate.includes("zai") || candidate.includes("glm")) return "zai";
    if (candidate.includes("gemini") || candidate.includes("google")) return "gemini";
    if (candidate.includes("anthropic") || candidate.includes("claude")) return "claude";
    if (candidate.includes("openai")) return "openai";

    return provider.id;
  }

  private renderMenuConfig(containerEl: HTMLElement): void {
    this.addHeading(containerEl, t(this.locale, "menuConfig.title"));

    for (const action of this.plugin.actionRegistry.getAllActions()) {
      new Setting(containerEl)
        .setName(action.name)
        .setDesc(action.builtin ? t(this.locale, "menuConfig.builtin") : t(this.locale, "menuConfig.custom"))
        .addToggle((toggle) =>
          toggle.setValue(action.visible).onChange((value) => {
            this.runAsync(async () => {
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
            });
          })
        )
        .addDropdown((dropdown) => {
          this.addOutputOptions(dropdown);
          dropdown.setValue(action.output);
          dropdown.onChange((value) => {
            this.runAsync(async () => {
              const output = this.normalizeOutputMode(value);
              if (action.builtin) {
                this.plugin.settings.actionPreferences[action.id] = {
                  ...this.plugin.settings.actionPreferences[action.id],
                  visible: action.visible,
                  order: action.order,
                  output
                };
              } else {
                const custom = this.plugin.settings.customActions.find((item) => item.id === action.id);
                if (custom) custom.output = output;
              }
              await this.plugin.saveSettings();
            });
          });
        })
        .addDropdown((dropdown) => {
          dropdown.addOption("", t(this.locale, "common.defaultProvider"));
          this.plugin.settings.providers.forEach((provider) => {
            dropdown.addOption(provider.id, provider.name);
          });
          dropdown.setValue(action.providerId ?? "");
          dropdown.onChange((value) => {
            this.runAsync(async () => {
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
          });
        })
        .addExtraButton((button) =>
          button.setIcon("arrow-up").setTooltip(this.locale === "zh" ? "上移" : "Move up").onClick(() => {
            this.runAsync(() => this.moveAction(action.id, -1));
          })
        )
        .addExtraButton((button) =>
          button.setIcon("arrow-down").setTooltip(this.locale === "zh" ? "下移" : "Move down").onClick(() => {
            this.runAsync(() => this.moveAction(action.id, 1));
          })
        );
    }
  }

  private renderCustomActions(containerEl: HTMLElement): void {
    this.addHeading(containerEl, t(this.locale, "settings.customActions"));

    for (const action of this.plugin.settings.customActions) {
      const details = containerEl.createEl("details", { cls: "chisel-custom-action" });
      details.createEl("summary", { text: action.name });

      new Setting(details)
        .setName(t(this.locale, "provider.name"))
        .addText((text) =>
          text.setValue(action.name).onChange((value) => {
            this.runAsync(async () => {
              action.name = value || action.name;
              await this.plugin.saveSettings();
            });
          })
        );

      new Setting(details)
        .setName(t(this.locale, "settings.icon"))
        .setDesc(t(this.locale, "settings.iconDesc"))
        .addText((text) =>
          text.setValue(action.icon).onChange((value) => {
            this.runAsync(async () => {
              action.icon = value || "sparkles";
              await this.plugin.saveSettings();
            });
          })
        );

      new Setting(details)
        .setName(t(this.locale, "settings.outputMode"))
        .addDropdown((dropdown) => {
          this.addOutputOptions(dropdown);
          dropdown.setValue(action.output);
          dropdown.onChange((value) => {
            this.runAsync(async () => {
              action.output = this.normalizeOutputMode(value);
              await this.plugin.saveSettings();
            });
          });
        });

      new Setting(details)
        .setName(t(this.locale, "settings.prompt"))
        .setDesc(t(this.locale, "settings.promptDesc"))
        .addTextArea((text) => {
          text.inputEl.rows = 8;
          text.inputEl.addClass("chisel-prompt-textarea");
          text.setValue(action.prompt);
          text.onChange((value) => {
            this.runAsync(async () => {
              action.prompt = value;
              await this.plugin.saveSettings();
            });
          });
        });

      new Setting(details).addButton((button) =>
        button.setButtonText(t(this.locale, "settings.removeAction")).onClick(() => {
          this.runAsync(async () => {
            this.plugin.settings.customActions = this.plugin.settings.customActions.filter((item) => item.id !== action.id);
            await this.plugin.saveSettings();
            this.display();
          });
        })
      );
    }

    new Setting(containerEl)
      .setName(t(this.locale, "settings.newCustomAction"))
      .addButton((button) =>
        button.setButtonText(t(this.locale, "settings.newAction")).setCta().onClick(() => {
          this.runAsync(async () => {
            this.plugin.settings.customActions.push(this.createCustomAction());
            await this.plugin.saveSettings();
            this.display();
          });
        })
      );

    new Setting(containerEl)
      .setName(t(this.locale, "importExport.title"))
      .setDesc(t(this.locale, "importExport.desc"))
      .addButton((button) =>
        button.setButtonText(t(this.locale, "importExport.export")).onClick(() => {
          this.runAsync(async () => {
            this.importExportValue = JSON.stringify(this.plugin.settings.customActions, null, 2);
            await navigator.clipboard.writeText(this.importExportValue);
            new Notice(this.locale === "zh" ? "已导出并复制到剪贴板" : "Exported and copied to clipboard");
            this.display();
          });
        })
      )
      .addButton((button) =>
        button.setButtonText(t(this.locale, "importExport.import")).onClick(() => {
          this.runAsync(() => this.importCustomActions());
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
    this.addHeading(containerEl, t(this.locale, "translation.title"));

    new Setting(containerEl)
      .setName(t(this.locale, "translation.source"))
      .addDropdown((dropdown) => {
        for (const option of LANGUAGE_OPTIONS) {
          dropdown.addOption(option.value, languageLabel(this.locale, option.value));
        }
        dropdown.setValue(normalizeLanguage(this.plugin.settings.translation.sourceLanguage, "auto"));
        dropdown.onChange((value) => {
          this.runAsync(async () => {
            this.plugin.settings.translation.sourceLanguage = value || "auto";
            await this.plugin.saveSettings();
          });
        });
      });

    new Setting(containerEl)
      .setName(t(this.locale, "translation.target"))
      .addDropdown((dropdown) => {
        for (const option of LANGUAGE_OPTIONS.filter((item) => item.value !== "auto")) {
          dropdown.addOption(option.value, languageLabel(this.locale, option.value));
        }
        dropdown.setValue(normalizeLanguage(this.plugin.settings.translation.targetLanguage, "Chinese"));
        dropdown.onChange((value) => {
          this.runAsync(async () => {
            this.plugin.settings.translation.targetLanguage = value || "Chinese";
            await this.plugin.saveSettings();
          });
        });
      });
  }

  private addHeading(containerEl: HTMLElement, text: string): void {
    new Setting(containerEl).setName(text).setHeading();
  }

  private addOutputOptions(dropdown: { addOption(value: string, display: string): unknown }): void {
    Object.entries(OUTPUT_OPTIONS[this.locale]).forEach(([value, label]) => {
      dropdown.addOption(value, label);
    });
  }

  private runAsync(task: () => Promise<void>): void {
    void task().catch((error) => {
      new Notice(error instanceof Error ? error.message : String(error));
    });
  }

  private normalizeLocale(value: string): Locale {
    return value === "en" ? "en" : "zh";
  }

  private normalizeTriggerMode(value: string): TriggerMode {
    return value === "hotkey" ? "hotkey" : "immediate";
  }

  private normalizeOutputMode(value: unknown): OutputMode {
    switch (value) {
      case "replace":
      case "append":
      case "insert_below":
      case "diff":
      case "popup":
        return value;
      default:
        return "popup";
    }
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
      let actions: unknown[] | null = null;
      if (Array.isArray(parsed)) {
        actions = parsed;
      } else if (this.isObjectRecord(parsed) && Array.isArray(parsed.customActions)) {
        actions = parsed.customActions;
      }

      if (!actions) {
        throw new Error(
          this.locale === "zh" ? "JSON 必须是动作数组，或包含 customActions 数组。" : "JSON must be an action array or contain a customActions array."
        );
      }

      this.plugin.settings.customActions = actions.map((action, index) => this.normalizeImportedAction(action, index));

      await this.plugin.saveSettings();
      new Notice(this.locale === "zh" ? "自定义动作已导入" : "Custom actions imported");
      this.display();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error));
    }
  }

  private normalizeImportedAction(action: unknown, index: number): CustomActionConfig {
    const item = this.isObjectRecord(action) ? action : {};
    return {
      id: this.stringValue(item.id, `custom-${Date.now()}-${index}`),
      name: this.stringValue(item.name, this.locale === "zh" ? "自定义动作" : "Custom action"),
      icon: this.stringValue(item.icon, "sparkles"),
      prompt: this.stringValue(item.prompt, "{{selection}}"),
      output: this.normalizeOutputMode(item.output),
      providerId: this.optionalString(item.providerId),
      model: this.optionalString(item.model),
      visible: typeof item.visible === "boolean" ? item.visible : true,
      order: typeof item.order === "number" ? item.order : 1000 + index * 10,
      hotkey: this.optionalString(item.hotkey)
    };
  }

  private isObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private stringValue(value: unknown, fallback: string): string {
    return typeof value === "string" && value.length > 0 ? value : fallback;
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === "string" && value.length > 0 ? value : undefined;
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
