import type { ActionContext, ChatMessage, ChiselAction, ChiselSettings } from "../types";

const EXTENSION_LANGUAGE: Record<string, string> = {
  c: "C",
  cpp: "C++",
  cs: "C#",
  css: "CSS",
  go: "Go",
  html: "HTML",
  java: "Java",
  js: "JavaScript",
  jsx: "React JSX",
  json: "JSON",
  kt: "Kotlin",
  lua: "Lua",
  md: "Markdown",
  php: "PHP",
  py: "Python",
  rb: "Ruby",
  rs: "Rust",
  sh: "Shell",
  sql: "SQL",
  swift: "Swift",
  ts: "TypeScript",
  tsx: "React TSX",
  vue: "Vue",
  yaml: "YAML",
  yml: "YAML"
};

const OUTPUT_ONLY_RULES = [
  "Return only the final processed result.",
  "Do not explain what you did.",
  "Do not restate, summarize, classify, or analyze the user's request.",
  "Do not add labels, headings, prefaces, conclusions, quotes, or wrappers unless they are part of the requested result.",
  "If the task transforms selected text, output the transformed text only."
].join(" ");

export function inferLanguage(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_LANGUAGE[extension] ?? "plain text";
}

export class PromptBuilder {
  constructor(private readonly getSettings: () => ChiselSettings) {}

  build(action: ChiselAction, context: ActionContext): ChatMessage[] {
    const settings = this.getSettings();
    const prompt = this.render(action.prompt, context, settings);

    return [
      {
        role: "system",
        content: `You are Chisel, a precise AI text-processing assistant inside Obsidian. Follow the user's instruction exactly and preserve Markdown when possible. ${OUTPUT_ONLY_RULES}`
      },
      {
        role: "user",
        content: prompt
      }
    ];
  }

  private render(template: string, context: ActionContext, settings: ChiselSettings): string {
    const values: Record<string, string> = {
      selection: context.selection,
      language: context.language,
      filename: context.filename,
      date: new Date().toISOString().slice(0, 10),
      sourceLanguage: settings.translation.sourceLanguage,
      targetLanguage: settings.translation.targetLanguage
    };

    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => values[key] ?? "");
  }
}
