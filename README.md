# Chisel

Chisel is a lightweight Obsidian community plugin for selection-first AI actions. Select text in the editor, pick an action from the floating menu, and send the result to a popup, replacement, append, or insertion below the current paragraph.

## Features

- Floating action menu for selected editor text
- Chinese and English UI switching
- Immediate trigger or `Cmd/Ctrl + Shift + A` command trigger
- Streaming responses with cancel support via `Escape`
- Built-in actions: translate, polish, expand, summarize, explain, continue, proofread, questions, tags
- Providers: OpenAI, Anthropic, Google Gemini, DeepSeek, and custom OpenAI-compatible endpoints
- Provider model discovery through supported model-list endpoints, with manual model input as a fallback
- Per-action visibility, ordering, output mode, and provider override
- Custom actions with `{{selection}}`, `{{language}}`, `{{filename}}`, `{{date}}`, `{{sourceLanguage}}`, and `{{targetLanguage}}`
- Custom action import/export as JSON
- Multi-language translation target selection

## Development

```bash
npm install
npm run build
```

For local Obsidian testing, copy or symlink this project folder into:

```text
<vault>/.obsidian/plugins/chisel
```

Then enable the plugin in Obsidian community plugin settings.

## Privacy

Chisel stores API keys locally through Obsidian's plugin data file. Selected text is sent only to the provider configured by the user for the action being run. Chisel does not collect telemetry.

## Support

If Chisel saves you time, you can support ongoing maintenance on Ko-fi:

https://ko-fi.com/xuyi

## Release

Create a semantic version tag that matches `manifest.json`.

```bash
npm version patch
git push
git push --tags
```

The GitHub Actions release workflow builds the plugin and attaches `main.js`, `manifest.json`, and `styles.css` to the GitHub release.
