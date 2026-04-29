export type Locale = "zh" | "en";

type TranslationKey =
  | "action.continue"
  | "action.explain"
  | "action.expand"
  | "action.polish"
  | "action.proofread"
  | "action.questions"
  | "action.summarize"
  | "action.tags"
  | "action.translate"
  | "common.defaultProvider"
  | "common.manual"
  | "common.notFetched"
  | "general.defaultOutput"
  | "general.defaultProvider"
  | "general.language"
  | "general.requestTimeout"
  | "general.requestTimeoutDesc"
  | "general.title"
  | "general.triggerMode"
  | "general.triggerModeDesc"
  | "importExport.desc"
  | "importExport.export"
  | "importExport.import"
  | "importExport.title"
  | "menuConfig.builtin"
  | "menuConfig.custom"
  | "menuConfig.title"
  | "model.current"
  | "model.currentDesc"
  | "model.fetch"
  | "model.list"
  | "model.listEmpty"
  | "provider.add"
  | "provider.addDesc"
  | "provider.apiKey"
  | "provider.baseUrl"
  | "provider.connection"
  | "provider.delete"
  | "provider.name"
  | "provider.placeholderOptional"
  | "provider.placeholderRequired"
  | "provider.test"
  | "provider.title"
  | "settings.customActions"
  | "settings.icon"
  | "settings.iconDesc"
  | "settings.newAction"
  | "settings.newCustomAction"
  | "settings.outputMode"
  | "settings.prompt"
  | "settings.promptDesc"
  | "settings.removeAction"
  | "translation.source"
  | "translation.target"
  | "translation.title";

const DICTIONARY: Record<Locale, Record<TranslationKey, string>> = {
  zh: {
    "action.continue": "续写",
    "action.explain": "解释",
    "action.expand": "扩写",
    "action.polish": "润色",
    "action.proofread": "纠错",
    "action.questions": "提问",
    "action.summarize": "缩写",
    "action.tags": "标签",
    "action.translate": "翻译",
    "common.defaultProvider": "默认提供商",
    "common.manual": "手动",
    "common.notFetched": "尚未拉取",
    "general.defaultOutput": "默认输出方式",
    "general.defaultProvider": "默认提供商",
    "general.language": "界面语言",
    "general.requestTimeout": "请求超时",
    "general.requestTimeoutDesc": "单位：秒。",
    "general.title": "通用设置",
    "general.triggerMode": "触发方式",
    "general.triggerModeDesc": "选择文本后自动显示菜单，或只在命令快捷键触发时显示。",
    "importExport.desc": "导出会把当前自定义动作写入下方文本框；导入接受数组或包含 customActions 字段的 JSON。",
    "importExport.export": "导出",
    "importExport.import": "导入",
    "importExport.title": "导入 / 导出",
    "menuConfig.builtin": "内置动作",
    "menuConfig.custom": "自定义动作",
    "menuConfig.title": "菜单配置",
    "model.current": "当前模型",
    "model.currentDesc": "可手动输入作为兜底；拉取模型列表后也可以从下拉框选择。",
    "model.fetch": "拉取模型",
    "model.list": "模型列表",
    "model.listEmpty": "配置 API Key 后点击拉取模型。若提供商不支持模型列表接口，可继续手动填写当前模型。",
    "provider.add": "添加",
    "provider.addDesc": "兼容 OpenAI /v1/chat/completions 的本地模型或第三方服务。",
    "provider.apiKey": "API Key",
    "provider.baseUrl": "Base URL",
    "provider.connection": "连接",
    "provider.delete": "删除",
    "provider.name": "名称",
    "provider.placeholderOptional": "可留空",
    "provider.placeholderRequired": "必填",
    "provider.test": "测试连接",
    "provider.title": "模型提供商",
    "settings.customActions": "自定义动作",
    "settings.icon": "图标",
    "settings.iconDesc": "使用 Lucide 图标名，例如 sparkles、code、languages。",
    "settings.newAction": "新增",
    "settings.newCustomAction": "新增自定义动作",
    "settings.outputMode": "输出方式",
    "settings.prompt": "Prompt 模板",
    "settings.promptDesc": "支持 {{selection}}、{{language}}、{{filename}}、{{date}}。",
    "settings.removeAction": "删除动作",
    "translation.source": "源语言",
    "translation.target": "目标语言",
    "translation.title": "翻译设置"
  },
  en: {
    "action.continue": "Continue",
    "action.explain": "Explain",
    "action.expand": "Expand",
    "action.polish": "Polish",
    "action.proofread": "Proofread",
    "action.questions": "Questions",
    "action.summarize": "Summarize",
    "action.tags": "Tags",
    "action.translate": "Translate",
    "common.defaultProvider": "Default provider",
    "common.manual": "manual",
    "common.notFetched": "Not fetched",
    "general.defaultOutput": "Default output",
    "general.defaultProvider": "Default provider",
    "general.language": "Display language",
    "general.requestTimeout": "Request timeout",
    "general.requestTimeoutDesc": "In seconds.",
    "general.title": "General",
    "general.triggerMode": "Trigger mode",
    "general.triggerModeDesc": "Show the menu after selecting text, or only from the command hotkey.",
    "importExport.desc": "Export writes custom actions into the text box below. Import accepts an array or JSON with a customActions field.",
    "importExport.export": "Export",
    "importExport.import": "Import",
    "importExport.title": "Import / Export",
    "menuConfig.builtin": "Built-in action",
    "menuConfig.custom": "Custom action",
    "menuConfig.title": "Menu",
    "model.current": "Current model",
    "model.currentDesc": "Manual input is kept as a fallback. Fetch models to choose from a list.",
    "model.fetch": "Fetch models",
    "model.list": "Model list",
    "model.listEmpty": "Configure the API key, then fetch models. If the provider does not support model listing, keep using manual input.",
    "provider.add": "Add",
    "provider.addDesc": "Local models or third-party services compatible with OpenAI /v1/chat/completions.",
    "provider.apiKey": "API Key",
    "provider.baseUrl": "Base URL",
    "provider.connection": "Connection",
    "provider.delete": "Delete",
    "provider.name": "Name",
    "provider.placeholderOptional": "Optional",
    "provider.placeholderRequired": "Required",
    "provider.test": "Test connection",
    "provider.title": "Providers",
    "settings.customActions": "Custom actions",
    "settings.icon": "Icon",
    "settings.iconDesc": "Use a Lucide icon name, such as sparkles, code, or languages.",
    "settings.newAction": "New",
    "settings.newCustomAction": "New custom action",
    "settings.outputMode": "Output",
    "settings.prompt": "Prompt template",
    "settings.promptDesc": "Supports {{selection}}, {{language}}, {{filename}}, and {{date}}.",
    "settings.removeAction": "Remove action",
    "translation.source": "Source language",
    "translation.target": "Target language",
    "translation.title": "Translation"
  }
};

export const LOCALE_OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" }
];

export const LANGUAGE_OPTIONS: Array<{ value: string; zh: string; en: string }> = [
  { value: "auto", zh: "自动检测", en: "Auto detect" },
  { value: "Chinese", zh: "中文", en: "Chinese" },
  { value: "English", zh: "英语", en: "English" },
  { value: "Japanese", zh: "日语", en: "Japanese" },
  { value: "Korean", zh: "韩语", en: "Korean" },
  { value: "French", zh: "法语", en: "French" },
  { value: "German", zh: "德语", en: "German" },
  { value: "Spanish", zh: "西班牙语", en: "Spanish" },
  { value: "Portuguese", zh: "葡萄牙语", en: "Portuguese" },
  { value: "Italian", zh: "意大利语", en: "Italian" },
  { value: "Russian", zh: "俄语", en: "Russian" },
  { value: "Arabic", zh: "阿拉伯语", en: "Arabic" },
  { value: "Hindi", zh: "印地语", en: "Hindi" },
  { value: "Vietnamese", zh: "越南语", en: "Vietnamese" }
];

export function t(locale: Locale, key: TranslationKey): string {
  return DICTIONARY[locale][key];
}

export function normalizeLanguage(value: string | undefined, fallback: string): string {
  const aliases: Record<string, string> = {
    "中文": "Chinese",
    "英语": "English",
    "英文": "English",
    "自动检测": "auto"
  };
  return aliases[value ?? ""] ?? value ?? fallback;
}

export function languageLabel(locale: Locale, value: string): string {
  const option = LANGUAGE_OPTIONS.find((item) => item.value === value);
  return option?.[locale] ?? value;
}
