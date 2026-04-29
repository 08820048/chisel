import { MarkdownView, Plugin } from "obsidian";
import type { ActionContext, ChiselSettings } from "../types";
import { inferLanguage } from "./PromptBuilder";

export interface SelectionSnapshot {
  context: ActionContext;
  rect: DOMRect;
}

export class SelectionHandler {
  private debounceTimer: number | null = null;

  constructor(
    private readonly plugin: Plugin,
    private readonly getSettings: () => ChiselSettings,
    private readonly onSelection: (snapshot: SelectionSnapshot) => void,
    private readonly onClear: () => void
  ) {}

  start(): void {
    this.plugin.registerDomEvent(document, "mouseup", (event) => this.scheduleCheck(event));
    this.plugin.registerDomEvent(document, "keyup", (event) => this.scheduleCheck(event));
    this.plugin.registerDomEvent(document, "selectionchange", (event) => this.scheduleCheck(event));
  }

  readSelection(): SelectionSnapshot | null {
    const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return null;

    const editor = view.editor;
    const selection = editor.getSelection();
    if (!selection) return null;

    const from = { ...editor.getCursor("from") };
    const to = { ...editor.getCursor("to") };
    const filename = view.file?.name ?? "";

    return {
      context: {
        editor,
        file: view.file,
        selection,
        range: { from, to },
        filename,
        language: inferLanguage(filename)
      },
      rect: this.readSelectionRect(editor, to)
    };
  }

  private scheduleCheck(event?: Event): void {
    if (this.shouldIgnoreEvent(event)) {
      return;
    }

    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      const snapshot = this.readSelection();
      if (!snapshot || !snapshot.context.selection.trim()) {
        this.onClear();
        return;
      }

      if (this.getSettings().triggerMode === "immediate") {
        this.onSelection(snapshot);
      }
    }, 50);
  }

  private shouldIgnoreEvent(event?: Event): boolean {
    const target = event?.target;
    if (target instanceof Element && target.closest(".chisel-menu, .chisel-more-menu")) {
      return true;
    }

    const activeElement = document.activeElement;
    return activeElement instanceof Element && Boolean(activeElement.closest(".chisel-menu, .chisel-more-menu"));
  }

  private readSelectionRect(editor: unknown, to: { line: number; ch: number }): DOMRect {
    const fallback = new DOMRect(window.innerWidth / 2, window.innerHeight / 2, 0, 0);
    const withCoords = editor as {
      coordsAtPos?: (pos: { line: number; ch: number }) => {
        left: number;
        right: number;
        top: number;
        bottom: number;
      } | null;
    };

    try {
      const coords = withCoords.coordsAtPos?.(to);
      if (!coords) return fallback;
      return new DOMRect(coords.left, coords.top, coords.right - coords.left, coords.bottom - coords.top);
    } catch {
      return fallback;
    }
  }
}
