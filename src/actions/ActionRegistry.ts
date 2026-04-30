import { BUILTIN_ACTIONS } from "./builtinActions";
import type { ChiselAction, ChiselSettings } from "../types";
import { t } from "../i18n";

const BUILTIN_NAME_KEYS: Record<string, Parameters<typeof t>[1]> = {
  continue: "action.continue",
  explain: "action.explain",
  expand: "action.expand",
  polish: "action.polish",
  proofread: "action.proofread",
  questions: "action.questions",
  summarize: "action.summarize",
  table: "action.table",
  tags: "action.tags",
  translate: "action.translate"
};

export class ActionRegistry {
  constructor(private readonly getSettings: () => ChiselSettings) {}

  getAllActions(): ChiselAction[] {
    const settings = this.getSettings();
    const builtins = BUILTIN_ACTIONS.map((action) => {
      const preference = settings.actionPreferences[action.id];
      return {
        ...action,
        name: BUILTIN_NAME_KEYS[action.id] ? t(settings.locale, BUILTIN_NAME_KEYS[action.id]) : action.name,
        visible: preference?.visible ?? action.visible,
        order: preference?.order ?? action.order,
        output: preference?.output ?? action.output,
        providerId: preference?.providerId ?? action.providerId
      };
    });

    const custom = settings.customActions.map((action) => ({
      ...action,
      builtin: false
    }));

    return [...builtins, ...custom].sort((a, b) => a.order - b.order);
  }

  getVisibleActions(): ChiselAction[] {
    return this.getAllActions().filter((action) => action.visible);
  }

  getAction(actionId: string): ChiselAction | undefined {
    return this.getAllActions().find((action) => action.id === actionId);
  }
}
