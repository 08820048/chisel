import type { ChiselAction } from "../types";

const basePrompt = (instruction: string): string => `${instruction}

请只返回处理后的结果，不要添加额外说明。

{{selection}}`;

export const BUILTIN_ACTIONS: ChiselAction[] = [
  {
    id: "translate",
    name: "翻译",
    icon: "languages",
    prompt: `检测所选文本语言，并在中文和英文之间互译。保持 Markdown 格式、列表、代码块和原有段落结构。目标语言：{{targetLanguage}}。

{{selection}}`,
    output: "popup",
    visible: true,
    order: 10,
    builtin: true
  },
  {
    id: "polish",
    name: "润色",
    icon: "sparkles",
    prompt: basePrompt("润色以下内容，使其更流畅、清晰、自然。保持原意、语气和 Markdown 格式。"),
    output: "popup",
    visible: true,
    order: 20,
    builtin: true
  },
  {
    id: "expand",
    name: "扩写",
    icon: "stretch-horizontal",
    prompt: basePrompt("扩写以下内容，补充必要的细节、背景和论据。保持结构清楚，不要偏离原意。"),
    output: "popup",
    visible: true,
    order: 30,
    builtin: true
  },
  {
    id: "summarize",
    name: "缩写",
    icon: "minimize-2",
    prompt: basePrompt("压缩以下内容，保留核心信息，改写为更简洁的表述。"),
    output: "popup",
    visible: true,
    order: 40,
    builtin: true
  },
  {
    id: "explain",
    name: "解释",
    icon: "circle-help",
    prompt: `解释以下内容的含义、背景、关键概念和可能的上下文。请使用清晰的 Markdown 结构。

{{selection}}`,
    output: "popup",
    visible: true,
    order: 50,
    builtin: true
  },
  {
    id: "continue",
    name: "续写",
    icon: "forward",
    prompt: basePrompt("根据以下内容自然续写，保持同样的风格和上下文。"),
    output: "append",
    visible: true,
    order: 60,
    builtin: true
  },
  {
    id: "proofread",
    name: "纠错",
    icon: "spell-check",
    prompt: basePrompt("检查并修正以下内容中的语法、拼写、标点和明显表达错误。保持原有格式。"),
    output: "popup",
    visible: true,
    order: 70,
    builtin: true
  },
  {
    id: "questions",
    name: "提问",
    icon: "messages-square",
    prompt: `基于以下内容，生成 3-5 个能延伸思考的高质量问题。使用 Markdown 列表。

{{selection}}`,
    output: "insert_below",
    visible: true,
    order: 80,
    builtin: true
  },
  {
    id: "tags",
    name: "标签",
    icon: "tags",
    prompt: `从以下内容提取适合 Obsidian 的标签。只返回一行标签，格式如 #概念 #主题 #关键词。

{{selection}}`,
    output: "append",
    visible: false,
    order: 90,
    builtin: true
  }
];
