import type { Editor, EditorPosition } from "obsidian";
import type { OutputMode, SelectionRange } from "../types";

export class EditorWriter {
  applyResult(editor: Editor, range: SelectionRange, result: string, mode: OutputMode): void {
    if (mode === "replace") {
      editor.replaceRange(result, range.from, range.to);
      editor.setCursor(this.advance(editor, range.from, result));
      return;
    }

    if (mode === "append") {
      const text = `\n\n${result}`;
      editor.replaceRange(text, range.to);
      editor.setCursor(this.advance(editor, range.to, text));
      return;
    }

    if (mode === "insert_below") {
      const lineEnd = {
        line: range.to.line,
        ch: editor.getLine(range.to.line).length
      };
      const text = `\n\n${result}`;
      editor.replaceRange(text, lineEnd);
      editor.setCursor(this.advance(editor, lineEnd, text));
    }
  }

  async streamResult(
    editor: Editor,
    range: SelectionRange,
    stream: AsyncIterable<string>,
    mode: OutputMode,
    signal: AbortSignal
  ): Promise<string> {
    let from: EditorPosition = range.from;
    let to: EditorPosition = range.to;
    let accumulated = "";

    if (mode === "append") {
      from = range.to;
      to = range.to;
      accumulated = "\n\n";
    }

    if (mode === "insert_below") {
      from = {
        line: range.to.line,
        ch: editor.getLine(range.to.line).length
      };
      to = from;
      accumulated = "\n\n";
    }

    for await (const chunk of stream) {
      if (signal.aborted) break;
      accumulated += chunk;
      editor.replaceRange(accumulated, from, to);
      to = this.advance(editor, from, accumulated);
    }

    editor.setCursor(to);
    return accumulated.replace(/^\n\n/, "");
  }

  private advance(editor: Editor, from: EditorPosition, text: string): EditorPosition {
    return editor.offsetToPos(editor.posToOffset(from) + text.length);
  }
}
