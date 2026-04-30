import { setIcon } from "obsidian";
import type { ChiselAction } from "../types";

export class SelectionMenu {
  private rootEl: HTMLDivElement;
  private moreEl: HTMLDivElement;
  private outsideHandler = (event: MouseEvent) => {
    const target = event.target as Node;
    if (!this.rootEl.contains(target) && !this.moreEl.contains(target)) {
      this.hide();
    }
  };

  constructor(
    private readonly onAction: (action: ChiselAction) => void,
    private readonly getMoreLabel: () => string = () => "More actions"
  ) {
    this.rootEl = document.createElement("div");
    this.rootEl.className = "chisel-menu is-hidden";

    this.moreEl = document.createElement("div");
    this.moreEl.className = "chisel-more-menu is-hidden";

    document.body.append(this.rootEl, this.moreEl);
  }

  show(rect: DOMRect, actions: ChiselAction[]): void {
    if (!this.rootEl.hasClass("is-hidden") && !this.moreEl.hasClass("is-hidden")) {
      return;
    }

    this.rootEl.empty();
    this.moreEl.empty();

    const primary = actions.slice(0, 5);
    const overflow = actions.slice(5);

    for (const action of primary) {
      this.rootEl.append(this.createButton(action));
    }

    if (overflow.length > 0) {
      const moreButton = document.createElement("button");
      moreButton.type = "button";
      moreButton.className = "chisel-menu-item";
      moreButton.textContent = "···";
      moreButton.setAttr("aria-label", this.getMoreLabel());
      moreButton.addEventListener("click", (event) => {
        event.stopPropagation();
        this.toggleMore(overflow);
      });
      this.rootEl.append(moreButton);
    }

    this.moreEl.addClass("is-hidden");
    this.rootEl.removeClass("is-hidden");
    this.position(rect);
    document.addEventListener("mousedown", this.outsideHandler, true);
  }

  hide(): void {
    this.rootEl.addClass("is-hidden");
    this.moreEl.addClass("is-hidden");
    document.removeEventListener("mousedown", this.outsideHandler, true);
  }

  destroy(): void {
    this.hide();
    this.rootEl.remove();
    this.moreEl.remove();
  }

  private createButton(action: ChiselAction): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chisel-menu-item";
    button.setAttr("aria-label", action.name);

    const icon = document.createElement("span");
    icon.className = "chisel-menu-icon";
    setIcon(icon, action.icon);

    const label = document.createElement("span");
    label.textContent = action.name;

    button.append(icon, label);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.hide();
      this.onAction(action);
    });

    return button;
  }

  private toggleMore(actions: ChiselAction[]): void {
    if (!this.moreEl.hasClass("is-hidden")) {
      this.moreEl.addClass("is-hidden");
      return;
    }

    this.moreEl.empty();
    for (const action of actions) {
      this.moreEl.append(this.createButton(action));
    }

    const menuRect = this.rootEl.getBoundingClientRect();
    this.moreEl.removeClass("is-hidden");
    const moreRect = this.moreEl.getBoundingClientRect();
    const left = Math.min(menuRect.right - moreRect.width, window.innerWidth - moreRect.width - 8);
    const top = Math.min(menuRect.bottom + 6, window.innerHeight - moreRect.height - 8);
    this.moreEl.setCssProps({
      "--chisel-menu-left": `${Math.max(8, left)}px`,
      "--chisel-menu-top": `${Math.max(8, top)}px`
    });
  }

  private position(rect: DOMRect): void {
    const menuRect = this.rootEl.getBoundingClientRect();
    let left = rect.right + 8;
    let top = rect.bottom + 8;

    if (left + menuRect.width > window.innerWidth - 8) {
      left = rect.left - menuRect.width - 8;
    }

    if (top + menuRect.height > window.innerHeight - 8) {
      top = rect.top - menuRect.height - 8;
    }

    this.rootEl.setCssProps({
      "--chisel-menu-left": `${Math.max(8, left)}px`,
      "--chisel-menu-top": `${Math.max(8, top)}px`
    });
  }
}
