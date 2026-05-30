import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Effect, ConfigProvider, Layer } from "effect";

// ─────────────────────────────────────────────────────────────────────────────
// Shared mock state — stable identity across vi.resetModules()
// ─────────────────────────────────────────────────────────────────────────────

const capturedEffects: unknown[] = [];
const runMain = vi.fn((effect: unknown) => {
  capturedEffects.push(effect);
});
const devToolsLayer = vi.fn(() => Layer.empty);
const note = vi.fn();

const loadStores = vi.fn(() => Effect.void);
const saveStores = vi.fn(() => Effect.void);
const print_title = vi.fn(() => Effect.void);
const isAuthorContext = vi.fn(() => Effect.succeed(false));
const getORCID = vi.fn(() => Effect.succeed("0000-0000-0000-0000"));
const getEvents = vi.fn(() => Effect.succeed([]));
const getCitationIDByStatusDashboard = vi.fn(() => null as string | null);
const getStatusesByValue = vi.fn(() => null as string | null);
const getGlobalStatuses = vi.fn(() => null as string | null);
const active_actions = vi.fn(() => Effect.succeed([] as unknown[]));
const action2option = vi.fn((a: { name: string }) => ({
  value: a.name,
  label: a.name,
}));
const actionsArr: Array<{ name: string; action: (rl: unknown) => unknown }> =
  [];
const select = vi.fn(() => Effect.succeed("none" as unknown));

const passThroughProvider =
  () =>
  <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, never> =>
    self as unknown as Effect.Effect<A, E, never>;

const provideContextStore = vi.fn(passThroughProvider);
const provideEventsStore = vi.fn(passThroughProvider);
const provideMetricsStore = vi.fn(passThroughProvider);

vi.mock("@effect/platform-node", () => ({
  NodeRuntime: { runMain },
}));

vi.mock("@effect/experimental", () => ({
  DevTools: { layer: devToolsLayer },
}));

vi.mock("@clack/prompts", () => ({ note }));

vi.mock("@univ-lehavre/atlas-citation-validate", () => ({
  loadStores,
  saveStores,
  print_title,
  isAuthorContext,
  getORCID,
  getEvents,
  getCitationIDByStatusDashboard,
  getStatusesByValue,
  getGlobalStatuses,
  active_actions,
  action2option,
  actions: actionsArr,
  select,
  provideContextStore,
  provideEventsStore,
  provideMetricsStore,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const importCommands = async () => {
  capturedEffects.length = 0;
  vi.resetModules();
  await import("./index.js");
  return capturedEffects[capturedEffects.length - 1] as Effect.Effect<
    void,
    unknown,
    never
  >;
};

const rateLimitConfig = ConfigProvider.fromMap(
  new Map([
    ["RATE_LIMIT", JSON.stringify({ limit: 1, interval: "1 seconds" })],
  ]),
);

const runCaptured = (effect: Effect.Effect<void, unknown, never>) =>
  Effect.runPromiseExit(
    effect.pipe(Effect.withConfigProvider(rateLimitConfig)),
  );

const resetAllMocks = () => {
  // Reset call history but keep default implementations
  runMain.mockClear();
  devToolsLayer.mockClear();
  note.mockClear();
  loadStores.mockReset().mockReturnValue(Effect.void);
  saveStores.mockReset().mockReturnValue(Effect.void);
  print_title.mockReset().mockReturnValue(Effect.void);
  isAuthorContext.mockReset().mockReturnValue(Effect.succeed(false) as never);
  getORCID
    .mockReset()
    .mockReturnValue(Effect.succeed("0000-0000-0000-0000") as never);
  getEvents.mockReset().mockReturnValue(Effect.succeed([]) as never);
  getCitationIDByStatusDashboard.mockReset().mockReturnValue(null);
  getStatusesByValue.mockReset().mockReturnValue(null);
  getGlobalStatuses.mockReset().mockReturnValue(null);
  active_actions.mockReset().mockReturnValue(Effect.succeed([]) as never);
  action2option.mockReset().mockImplementation((a: { name: string }) => ({
    value: a.name,
    label: a.name,
  }));
  actionsArr.length = 0;
  select.mockReset().mockReturnValue(Effect.succeed("none") as never);
  provideContextStore.mockReset().mockImplementation(passThroughProvider);
  provideEventsStore.mockReset().mockImplementation(passThroughProvider);
  provideMetricsStore.mockReset().mockImplementation(passThroughProvider);
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("atlas-biblio CLI top-level", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetAllMocks();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("imports and wires the runtime via NodeRuntime.runMain exactly once", async () => {
    await importCommands();

    expect(runMain).toHaveBeenCalledTimes(1);
    expect(devToolsLayer).toHaveBeenCalledTimes(1);
    expect(provideContextStore).toHaveBeenCalledTimes(1);
    expect(provideEventsStore).toHaveBeenCalledTimes(1);
    expect(provideMetricsStore).toHaveBeenCalledTimes(1);
  });
});

describe("start()", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetAllMocks();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("fails fast when loadStores fails (forever loop never entered)", async () => {
    loadStores.mockReturnValue(
      Effect.fail(new Error("boom loadStores")) as never,
    );

    const effect = await importCommands();
    const exit = await runCaptured(effect);

    expect(exit._tag).toBe("Failure");
    expect(loadStores).toHaveBeenCalledTimes(1);
    // ask() must not have been entered when loadStores fails
    expect(print_title).not.toHaveBeenCalled();
  });
});

describe("ask() — single iteration via forever-then-fail", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetAllMocks();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("logs 'Action non trouvée' when select returns an unknown action", async () => {
    let call = 0;
    active_actions.mockImplementation(() => {
      call += 1;
      if (call >= 2) return Effect.fail(new Error("stop")) as never;
      return Effect.succeed([]) as never;
    });
    select.mockReturnValue(Effect.succeed("unknown-action") as never);

    const effect = await importCommands();
    const exit = await runCaptured(effect);

    expect(exit._tag).toBe("Failure");
    expect(print_title).toHaveBeenCalled();
    expect(select).toHaveBeenCalled();
    expect(saveStores).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith("Action non trouvée");
  });

  it("invokes the matched action when select returns a known action name", async () => {
    const actionFn = vi.fn(() => Effect.void);
    const fakeAction = { name: "go", action: actionFn };
    actionsArr.push(fakeAction);

    let call = 0;
    active_actions.mockImplementation(() => {
      call += 1;
      if (call >= 2) return Effect.fail(new Error("stop")) as never;
      return Effect.succeed([fakeAction]) as never;
    });
    select.mockReturnValue(Effect.succeed("go") as never);

    const effect = await importCommands();
    const exit = await runCaptured(effect);

    expect(exit._tag).toBe("Failure"); // stopped on 2nd iteration
    expect(actionFn).toHaveBeenCalledTimes(1);
    expect(action2option).toHaveBeenCalled();
  });
});

describe("dashboard() branches", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetAllMocks();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("returns early when isAuthorContext is false", async () => {
    isAuthorContext.mockReturnValue(Effect.succeed(false) as never);
    let call = 0;
    active_actions.mockImplementation(() => {
      call += 1;
      if (call >= 2) return Effect.fail(new Error("stop")) as never;
      return Effect.succeed([]) as never;
    });

    const effect = await importCommands();
    await runCaptured(effect);

    expect(isAuthorContext).toHaveBeenCalled();
    expect(getORCID).not.toHaveBeenCalled();
    expect(getEvents).not.toHaveBeenCalled();
  });

  it("collects all dashboard rows and calls note when stats are present", async () => {
    isAuthorContext.mockReturnValue(Effect.succeed(true) as never);
    getCitationIDByStatusDashboard.mockReturnValue("3");
    getStatusesByValue.mockReturnValue("7");
    getGlobalStatuses.mockReturnValue("42");

    let call = 0;
    active_actions.mockImplementation(() => {
      call += 1;
      if (call >= 2) return Effect.fail(new Error("stop")) as never;
      return Effect.succeed([]) as never;
    });

    const effect = await importCommands();
    await runCaptured(effect);

    expect(getORCID).toHaveBeenCalled();
    expect(getEvents).toHaveBeenCalled();
    expect(getCitationIDByStatusDashboard).toHaveBeenCalled();
    // dashboard() invokes getStatusesByValue 4 times per iteration; the
    // forever loop runs 2 iterations before active_actions fails on the 2nd.
    expect(getStatusesByValue).toHaveBeenCalledTimes(8);
    expect(getGlobalStatuses).toHaveBeenCalled();
    expect(note).toHaveBeenCalled();
    const noteCall = note.mock.calls[0]!;
    expect(noteCall[0]).toContain("identifiants OpenAlex d'auteurs");
    expect(noteCall[0]).toContain("formes imprimées d'auteurs");
    expect(noteCall[0]).toContain("affiliations");
    expect(noteCall[0]).toContain("formes imprimées d'affiliations");
    expect(noteCall[0]).toContain("objets");
    expect(noteCall[1]).toBe("Tableau de bord");
    // Exercise the `format` callback for function coverage
    const opts = noteCall[2] as { format: (line: string) => string };
    expect(opts.format("hello")).toBe("hello");
  });

  it("skips note when every dashboard stat is null", async () => {
    isAuthorContext.mockReturnValue(Effect.succeed(true) as never);
    getCitationIDByStatusDashboard.mockReturnValue(null);
    getStatusesByValue.mockReturnValue(null);
    getGlobalStatuses.mockReturnValue(null);

    let call = 0;
    active_actions.mockImplementation(() => {
      call += 1;
      if (call >= 2) return Effect.fail(new Error("stop")) as never;
      return Effect.succeed([]) as never;
    });

    const effect = await importCommands();
    await runCaptured(effect);

    expect(note).not.toHaveBeenCalled();
  });
});
