import { beforeEach, describe, expect, it, vi } from "vitest";
import { Effect } from "effect";
import type { Action } from "./types.js";

const mocks = vi.hoisted(() => ({
  actions: [] as Action[],
}));

vi.mock("./index.js", () => ({
  actions: mocks.actions,
}));

import { active_actions } from "./filter.js";

const makeAction = (name: string, visible?: Action["visible"]): Action => ({
  name,
  visible,
  action: () => Effect.void,
});

describe("active_actions", () => {
  beforeEach(() => {
    mocks.actions.length = 0;
  });

  it("keeps actions without visibility predicates", async () => {
    const alwaysVisible = makeAction("always visible");
    mocks.actions.push(alwaysVisible);

    const result = await Effect.runPromise(active_actions());

    expect(result).toEqual([alwaysVisible]);
  });

  it("keeps actions when all visibility predicates return true", async () => {
    const visible = makeAction("visible", [
      () => Effect.succeed(true),
      () => Effect.succeed(true),
    ]);
    mocks.actions.push(visible);

    const result = await Effect.runPromise(active_actions());

    expect(result).toEqual([visible]);
  });

  it("filters actions when one visibility predicate returns false", async () => {
    const visible = makeAction("visible", [() => Effect.succeed(true)]);
    const hidden = makeAction("hidden", [
      () => Effect.succeed(true),
      () => Effect.succeed(false),
    ]);
    mocks.actions.push(visible, hidden);

    const result = await Effect.runPromise(active_actions());

    expect(result).toEqual([visible]);
  });
});
