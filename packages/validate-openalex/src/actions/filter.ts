import { Effect } from "effect";
import { actions } from "./index.js";
import { ContextStore, EventsStore } from "../store/index.js";
import type { Action } from "./types.js";

const active_actions = (): Effect.Effect<
  Action[],
  Error,
  ContextStore | EventsStore
> =>
  Effect.gen(function* () {
    const items: Action[] = [];
    for (const action of actions) {
      if (action.visible === undefined) {
        items.push(action);
      } else {
        let nbr = 0;
        for (const visible of action.visible) {
          const isViewable = yield* visible();
          if (isViewable) nbr++;
        }
        if (nbr === action.visible.length) items.push(action);
      }
    }
    return items;
  });

export { active_actions };
