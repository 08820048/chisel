import type { ChiselAction } from "../types";

const OUTPUT_ONLY = `输出要求：
- 只返回最终处理结果。
- 不要复述用户要求、不要解释处理过程、不要添加标题/前缀/结论。
- 不要输出“核心信息”“简洁改写”“处理结果”等标签。
- 除非结果本身需要 Markdown，否则不要额外包裹格式。`;

const basePrompt = (instruction: string): string => `${instruction}

${OUTPUT_ONLY}

{{selection}}`;

export const BUILTIN_ACTIONS: ChiselAction[] = [
  {
    id: "translate",
    name: "翻译",
    icon: "languages",
    prompt: `检测所选文本语言，并翻译为目标语言。保持 Markdown 格式、列表、代码块和原有段落结构。目标语言：{{targetLanguage}}。

${OUTPUT_ONLY}

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

${OUTPUT_ONLY}

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

${OUTPUT_ONLY}

{{selection}}`,
    output: "insert_below",
    visible: true,
    order: 80,
    builtin: true
  },
  {
    id: "table",
    name: "转表格",
    icon: "table",
    prompt: `分析以下内容，提取其中适合结构化展示的信息，并转换为 Markdown 表格。
- 根据内容自动判断表头和列数。
- 合并同类信息，保留关键事实、数值、名称、时间、状态、描述等可表格化信息。
- 如果原文已经包含列表、段落、键值对、CSV、TSV 或半结构化文本，请整理为规范 Markdown 表格。
- 只返回一个或多个 Markdown 表格，不要使用代码块包裹，不要添加额外说明。

${OUTPUT_ONLY}

{{selection}}`,
    output: "popup",
    visible: true,
    order: 85,
    builtin: true
  },
  {
    id: "tags",
    name: "标签",
    icon: "tags",
    prompt: `从以下内容提取适合 Obsidian 的标签。只返回一行标签，格式如 #概念 #主题 #关键词。

${OUTPUT_ONLY}

{{selection}}`,
    output: "append",
    visible: false,
    order: 90,
    builtin: true
  }
];
