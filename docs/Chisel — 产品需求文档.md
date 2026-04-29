
> Obsidian AI 划词处理插件 · 版本：v0.1 · 状态：规划中 · 类型：Obsidian 社区插件
---
## 1. 背景与目标

### 背景

Obsidian 是一款以本地存储为核心的 Markdown 笔记软件，拥有强大的插件生态。目前市场上已有一些 AI 相关插件（如 Copilot、Smart Composer），但缺少专注于**划词即处理**场景的轻量工具。用户在写作和阅读过程中，常常需要对特定文本片段做翻译、润色、解释等操作，现有方案多需要手动复制、切换工具，流程割裂。

### 目标

开发一款 Obsidian 插件，实现：

- 在编辑器中选中文本后，弹出浮动 AI 操作菜单
- 支持多种内置 AI 动作（翻译、润色、扩写等）
- 支持主流 AI 模型提供商，用户只需填入 API Key 即可使用
- 支持任意 OpenAI 兼容协议的自定义提供商（如本地 Ollama）
- 处理结果可以替换原文、追加到光标后、或在弹窗中展示

### 成功指标

- 插件从选中到出现菜单的响应时间 < 100ms
- 支持至少 4 个内置提供商 + 无限自定义提供商
- 核心动作覆盖率：翻译、润色、扩写、缩写、解释 5 个 P0 动作在 MVP 交付

---

## 2. 用户故事

```
作为一名 Obsidian 用户，
当我在编辑器中选中一段文字时，
我希望能看到一个浮动菜单，
让我可以快速选择 AI 动作来处理这段文字，
而不需要离开当前编辑界面。
```

**细化场景：**

|场景|用户行为|期望结果|
|---|---|---|
|阅读英文资料时|选中英文句子 → 点击「翻译」|中文翻译显示在弹窗或原文下方|
|写作草稿时|选中粗糙段落 → 点击「润色」|润色后的版本替换或对比显示|
|记录笔记时|选中关键词 → 点击「解释」|弹窗展示详细解释|
|整理内容时|选中长段落 → 点击「缩写」|精简版本替换原文|
|自定义需求|选中代码注释 → 使用自定义动作「生成文档」|按 prompt 模板处理并插入|

---

## 3. 功能需求

### 3.1 划词触发菜单（P0）

- 用户在编辑器中选中文本（鼠标选中或键盘选中）后，自动在选区附近弹出浮动操作菜单
- 菜单出现位置：选区末尾右下方，靠近屏幕边缘时自动翻转
- 菜单消失时机：点击菜单外区域、按 `Escape` 键、取消选中
- 支持配置触发方式：
    - 模式 A：选中即触发（默认）
    - 模式 B：选中后按快捷键（如 `Cmd/Ctrl + Shift + A`）触发
- 菜单宽度自适应，支持动作项排序和显示/隐藏配置

### 3.2 动作执行（P0）

- 点击动作后，菜单关闭，开始调用 AI API
- 调用期间显示 loading 状态（菜单位置或编辑器内 spinner）
- 支持流式响应（SSE Streaming），结果实时渲染
- 支持取消正在进行的请求（按 `Escape` 或点击取消按钮）
- 请求失败时展示错误信息，提供重试选项

### 3.3 结果输出方式（P0）

支持以下输出模式，每个动作可独立配置默认模式：

|模式|描述|
|---|---|
|`replace`|用 AI 结果替换选中文本|
|`append`|在选中文本末尾追加结果（空一行）|
|`insert_below`|在当前段落下方新建段落插入|
|`popup`|在弹窗中展示结果，用户手动决定是否采用|
|`diff`|对比模式，原文与结果并排展示（P2）|

### 3.4 模型提供商管理（P0）

- 在设置面板中管理多个提供商
- 每个提供商独立配置 API Key、Model、Base URL（自定义时）
- 支持设置全局默认提供商
- 支持每个动作单独覆盖使用的提供商

### 3.5 自定义动作（P1）

- 用户可创建自定义动作，配置：
    - 动作名称（显示在菜单上）
    - Prompt 模板（支持 `{{selection}}` 变量）
    - 输出方式
    - 绑定快捷键（可选）
    - 图标（从预设列表选择）
- 自定义动作持久化存储，支持导入/导出（JSON 格式）

---

## 4. 交互设计

### 4.1 浮动菜单结构

```
┌─────────────────────────────────────────┐
│  ✦ 翻译  │  ◈ 润色  │  ⟡ 扩写  │  ◇ 缩写  │  ··· │
└─────────────────────────────────────────┘
```

- 默认展示 4-5 个最常用动作，其余收入「···」二级菜单
- 菜单项支持图标 + 文字，或纯文字（可配置）
- 悬浮时有 hover 状态，点击有按下反馈

### 4.2 执行状态展示

**流式写入（replace/append 模式）：**

```
[原始选中文本被替换] → AI 结果逐字符实时写入 → 完成后光标定位到结果末尾
```

**弹窗模式：**

```
弹窗标题：动作名称 + 模型名称
弹窗内容：流式渲染 AI 结果
底部操作：[替换原文] [追加到原文后] [复制] [关闭]
```

### 4.3 快捷键

|快捷键|功能|
|---|---|
|`Cmd/Ctrl + Shift + A`|触发菜单（触发模式 B）|
|`Escape`|关闭菜单 / 取消请求|
|自定义|直接触发指定动作（不弹菜单）|

---

## 5. 模型提供商支持

### 5.1 内置提供商

|提供商|默认模型|协议|备注|
|---|---|---|---|
|OpenAI|`gpt-4o`|原生 OpenAI|需 API Key|
|Anthropic|`claude-sonnet-4-5`|Anthropic Messages API|独立适配器|
|Google Gemini|`gemini-2.0-flash`|OpenAI 兼容|通过 `generativelanguage.googleapis.com/v1beta/openai`|
|DeepSeek|`deepseek-chat`|OpenAI 兼容|`api.deepseek.com`|

### 5.2 自定义提供商

用户可添加任意数量的自定义提供商，配置项：

```
名称：         My Local Model
Base URL：     http://localhost:11434/v1
API Key：      （留空或填 ollama）
Model：        llama3.2
```

只要接口兼容 OpenAI `/v1/chat/completions`，即可接入。

### 5.3 Provider 抽象接口

```typescript
interface IProvider {
  id: string;
  name: string;
  complete(
    messages: ChatMessage[],
    options: { stream: boolean; signal: AbortSignal }
  ): Promise<string | AsyncIterable<string>>;
}
```

Anthropic 适配器处理 header 差异（`x-api-key` vs `Authorization: Bearer`）和消息格式差异，其余提供商复用 `OpenAIAdapter`，仅修改 `baseURL`。

---

## 6. 内置动作清单

### P0 核心动作（MVP 必须交付）

|动作|Prompt 思路|默认输出方式|
|---|---|---|
|**翻译**|检测语言，中英互译，保持格式|`popup`|
|**润色**|改善流畅度，保持原意和风格|`popup`（用户确认后替换）|
|**扩写**|丰富内容，补充细节和论据|`popup`|
|**缩写/摘要**|压缩为简洁表述，保留核心信息|`popup`|
|**解释**|解释含义、背景、原理|`popup`|

### P1 扩展动作（Phase 2 交付）

|动作|描述|默认输出方式|
|---|---|---|
|**续写**|根据选中内容生成后续|`append`|
|**纠错**|检查并修正语法、拼写|`popup`|
|**改变语气**|正式 / 轻松 / 学术 等风格切换|`popup`|
|**提问**|生成延伸思考问题|`insert_below`|

### P2 进阶动作（Phase 3 交付）

|动作|描述|默认输出方式|
|---|---|---|
|**转换格式**|文本 → 列表 / 表格 / 代码块等|`replace`|
|**生成标签**|提取关键词作为 Obsidian 标签|`append`|
|**链接笔记**|识别可链接到已有笔记的概念（需 Vault 索引）|`replace`|

---

## 7. 自定义动作

### 7.1 Prompt 模板语法

```
你是一个专业的技术文档作者。
请为以下代码生成 JSDoc 注释：

{{selection}}

要求：简洁、准确、包含参数说明。
```

**支持的变量：**

|变量|说明|
|---|---|
|`{{selection}}`|用户选中的文本（必须包含）|
|`{{language}}`|当前文件的编程语言（从 code block 推断）|
|`{{filename}}`|当前文件名|
|`{{date}}`|当前日期|

### 7.2 自定义动作配置结构

```json
{
  "id": "custom-jsdoc",
  "name": "生成 JSDoc",
  "icon": "code",
  "prompt": "你是一个专业的技术文档作者...\n\n{{selection}}",
  "provider": "openai",
  "model": "gpt-4o",
  "output": "insert_below",
  "hotkey": "Cmd+Shift+J"
}
```

---

## 8. 设置面板规划

### 8.1 面板结构

```
设置 → AI Selection Assistant
├── 通用设置
│   ├── 触发方式（选中即触发 / 快捷键触发）
│   ├── 默认提供商
│   └── 默认输出方式
├── 模型提供商
│   ├── OpenAI（API Key 输入框）
│   ├── Anthropic（API Key 输入框）
│   ├── Google Gemini（API Key 输入框）
│   ├── DeepSeek（API Key 输入框）
│   └── + 添加自定义提供商
├── 菜单配置
│   ├── 动作排序（拖拽）
│   └── 动作显示/隐藏
├── 自定义动作
│   ├── 动作列表（增删改）
│   └── 导入 / 导出
└── 翻译设置
    ├── 目标语言
    └── 源语言（自动检测 / 指定）
```

### 8.2 API Key 安全

- 存储使用 Obsidian 原生 `loadData/saveData`，数据存放在 `.obsidian/plugins/chisel/data.json`
- Key 在设置面板中显示为密码输入框（`type="password"`）
- 不上传、不同步到云端（除非用户手动开启 Obsidian Sync，此为用户行为）
- 提供「测试连接」按钮验证 Key 有效性

---

## 9. 技术架构

### 9.1 项目结构

```
obsidian-chisel/
├── src/
│   ├── main.ts                 # 插件入口，注册事件和命令
│   ├── ui/
│   │   ├── SelectionMenu.ts    # 浮动菜单组件
│   │   ├── ResultModal.ts      # 结果弹窗
│   │   └── SettingsTab.ts      # 设置面板
│   ├── core/
│   │   ├── SelectionHandler.ts # 监听选中事件
│   │   ├── ActionRunner.ts     # 动作执行调度
│   │   ├── PromptBuilder.ts    # 构建 prompt
│   │   ├── StreamParser.ts     # SSE 流式解析
│   │   └── EditorWriter.ts     # 结果写入编辑器
│   ├── providers/
│   │   ├── IProvider.ts        # 抽象接口
│   │   ├── OpenAIAdapter.ts    # OpenAI / 兼容协议
│   │   ├── AnthropicAdapter.ts # Anthropic 独立适配
│   │   └── ProviderManager.ts  # 提供商注册与管理
│   ├── actions/
│   │   ├── builtinActions.ts   # 内置动作定义
│   │   └── ActionRegistry.ts  # 动作注册表
│   └── types.ts                # 全局类型定义
├── styles.css
├── manifest.json
└── package.json
```

### 9.2 关键实现要点

**划词菜单定位：**

```typescript
// 使用 editor.coordsAtPos() 获取选区坐标
const cursor = editor.getCursor('to');
const coords = editor.coordsAtPos(editor.posToOffset(cursor));
// 结合 scrollY 计算绝对位置，并做边界检测
```

**流式写入编辑器：**

```typescript
// 记录起始位置，逐 token 扩展替换范围
const from = editor.getCursor('from');
let to = editor.getCursor('to');
for await (const chunk of stream) {
  editor.replaceRange(accumulated, from, to);
  to = editor.offsetToPos(editor.posToOffset(from) + accumulated.length);
}
```

**Provider 统一调用：**

```typescript
// OpenAI 兼容适配器（适用于 DeepSeek、Gemini、自定义等）
class OpenAIAdapter implements IProvider {
  async *complete(messages, { signal }) {
    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, messages, stream: true }),
      signal,
    });
    // 解析 SSE 流
    for await (const chunk of parseSSE(res.body)) {
      yield chunk.choices[0]?.delta?.content ?? '';
    }
  }
}
```

### 9.3 依赖

|依赖|用途|说明|
|---|---|---|
|`obsidian`|插件 API|peer dependency，无需打包|
|TypeScript|开发语言||
|esbuild|构建打包|官方模板标配|
|无其他运行时依赖|—|保持轻量，不引入 React 等框架|

---

## 10. 开发阶段规划

### Phase 1 · MVP（目标：2 周）

**交付目标：** 插件可以跑起来，核心流程走通

- [ ] 初始化插件项目（基于 `obsidian-sample-plugin`）
- [ ] 实现选中文本监听
- [ ] 实现浮动菜单 UI（静态，无样式优化）
- [ ] 接入 OpenAI API（非流式）
- [ ] 实现翻译、润色 2 个动作
- [ ] 结果弹窗展示
- [ ] 基础设置面板（OpenAI Key 配置）

### Phase 2 · 完善（目标：3 周）

**交付目标：** 功能完整，可日常使用

- [ ] 流式响应（SSE）支持
- [ ] 所有 P0 + P1 内置动作
- [ ] 接入 Anthropic、Gemini、DeepSeek
- [ ] 自定义 Provider 配置
- [ ] 所有结果输出模式（replace/append/insert_below）
- [ ] 菜单位置边界检测优化
- [ ] 取消请求支持
- [ ] 错误处理与重试

### Phase 3 · 打磨（目标：2 周）

**交付目标：** 体验完善，准备发布

- [ ] 自定义动作完整配置界面
- [ ] 动作排序与显示/隐藏配置
- [ ] 操作历史记录（可选，可关闭）
- [ ] 上下文感知（传入前后文提升效果）
- [ ] P2 动作实现
- [ ] 补充 README 和文档
- [ ] 提交到 Obsidian 社区插件库

---

## 11. 非功能性需求

### 性能

- 菜单出现延迟 < 100ms（纯 UI，不等待 API）
- 插件加载时间 < 200ms，不影响 Obsidian 启动速度
- API 请求超时设置：默认 30s，可配置

### 兼容性

- 支持 Obsidian 最低版本：1.4.0+
- 支持桌面端（macOS、Windows、Linux）
- 移动端（iOS/Android）做基础适配，不作为主要目标

### 隐私

- 所有 API Key 仅存储在本地
- 不收集任何用户数据、不发送遥测
- 在 README 中明确说明：选中文本会发送至用户配置的 AI 服务

---

## 12. 开放问题

|#|问题|优先级|状态|
|---|---|---|---|
|1|是否支持 Live Preview 和 Source Mode 两种编辑模式？|高|已决策|
|2|流式写入时如果用户同时操作编辑器，如何处理冲突？|高|已决策|
|3|是否维护对话上下文（多轮追问）？还是每次都是单次请求？|中|已决策|
|4|自定义动作是否支持调用外部脚本？|低|已决策|
|5|是否提供 Prompt 预设市场（社区共享 prompt）？|低|已决策|

### 决策详情

**问题 1 · 编辑模式兼容性**

Live Preview 和 Source Mode 底层同为 CodeMirror 6，Obsidian 的 `Editor` 抽象层已封装大部分差异，`editor.getSelection()` 在两种模式下均可用。**决策：MVP 阶段优先保证 Live Preview 可用，Source Mode 作为 Phase 2 兼容项跟进。**

**问题 2 · 流式写入冲突处理**

写入期间若用户在写入范围内触发键盘输入，立即终止流式请求并保留已写入内容，不强行继续（否则内容错乱）。写入期间在编辑器顶部显示轻提示「生成中，按 Esc 取消」。**决策：检测到写入范围内有用户输入时，abort 请求，保留已生成内容，提示用户。**

**问题 3 · 对话上下文**

Chisel 的定位是「处理一段文字」而非「与 AI 对话」，多轮上下文会增加状态管理复杂度，也容易让用户困惑（如翻译结果受上次操作影响）。需要多轮追问的场景交由 Copilot 类插件承接。**决策：始终使用单次请求，不维护跨动作的对话上下文。**

**问题 4 · 外部脚本调用**

任意外部脚本调用安全边界不清晰。如未来有扩展需求，可考虑与 Obsidian 生态内的 Templater / Dataview 集成，而非开放任意脚本执行。**决策：不支持外部脚本，长期维持此限制。**

**问题 5 · Prompt 预设市场**

产品内市场维护成本高，早期用户量不足以支撑。**决策：在 GitHub 仓库 Discussions 建立社区共享页，由用户自由贡献 prompt，待插件用户量达到一定规模后再评估是否内置。**

---

_文档最后更新：2026-04-29_