import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect, Exit } from "effect";

const clackState = {
  groupImpl: vi.fn(),
  textImpl: vi.fn(),
  selectImpl: vi.fn(),
  autocompleteImpl: vi.fn(),
  introCalls: [] as string[],
  outroCalls: [] as string[],
  cancelCalls: [] as string[],
};

vi.mock("@clack/prompts", () => ({
  intro: vi.fn((m: string) => {
    clackState.introCalls.push(m);
  }),
  outro: vi.fn((m: string) => {
    clackState.outroCalls.push(m);
  }),
  cancel: vi.fn((m: string) => {
    clackState.cancelCalls.push(m);
  }),
  group: vi.fn((...args: unknown[]) => clackState.groupImpl(...args)),
  text: vi.fn((opts: unknown) => clackState.textImpl(opts)),
  select: vi.fn((opts: unknown) => clackState.selectImpl(opts)),
  autocompleteMultiselect: vi.fn((opts: unknown) =>
    clackState.autocompleteImpl(opts),
  ),
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("picocolors", () => ({
  default: {
    bgCyan: (s: string) => `bgCyan(${s})`,
    bgGreen: (s: string) => `bgGreen(${s})`,
    black: (s: string) => `black(${s})`,
  },
}));

import * as clack from "@clack/prompts";
import { prepare, finish, who, selection, multiple, log } from "./index.js";

describe("prompts/index", () => {
  beforeEach(() => {
    clackState.groupImpl.mockReset();
    clackState.textImpl.mockReset();
    clackState.selectImpl.mockReset();
    clackState.autocompleteImpl.mockReset();
    clackState.introCalls.length = 0;
    clackState.outroCalls.length = 0;
    clackState.cancelCalls.length = 0;
    vi.clearAllMocks();
  });

  describe("prepare()", () => {
    it("calls clack.intro with a styled title", () => {
      prepare("My Title");
      expect(clack.intro).toHaveBeenCalledTimes(1);
      expect(clackState.introCalls[0]).toContain("My Title");
    });
  });

  describe("finish()", () => {
    it("calls clack.outro with a styled title", () => {
      finish("All done");
      expect(clack.outro).toHaveBeenCalledTimes(1);
      expect(clackState.outroCalls[0]).toContain("All done");
    });
  });

  describe("log re-export", () => {
    it("exposes the clack log object", () => {
      expect(log).toBe(clack.log);
      expect(typeof log.info).toBe("function");
    });
  });

  describe("who()", () => {
    it("returns the entered name on success", async () => {
      clackState.groupImpl.mockImplementation(
        async (fields: Record<string, () => Promise<unknown>>) => {
          clackState.textImpl.mockResolvedValue("Albert");
          const name = await fields["name"]!();
          return { name };
        },
      );

      const result = await Effect.runPromise(who("Enter a name"));

      expect(result).toEqual({ name: "Albert" });
      expect(clack.group).toHaveBeenCalledTimes(1);
      expect(clack.text).toHaveBeenCalledTimes(1);
    });

    it("the inner text validator requires a non-empty value", async () => {
      let capturedOpts: { validate: (v: string) => string | undefined } | null =
        null;
      clackState.groupImpl.mockImplementation(
        async (fields: Record<string, () => Promise<unknown>>) => {
          clackState.textImpl.mockImplementation((opts: unknown) => {
            capturedOpts = opts as typeof capturedOpts extends infer T
              ? T
              : never;
            return Promise.resolve("Curie");
          });
          await fields["name"]!();
          return { name: "Curie" };
        },
      );

      await Effect.runPromise(who("ignored"));

      expect(capturedOpts).not.toBeNull();
      const opts = capturedOpts as unknown as {
        validate: (v: string) => string | undefined;
      };
      expect(opts.validate("")).toBe("Value is required!");
      expect(opts.validate("Marie")).toBeUndefined();
    });

    it("wraps a thrown error in PromptError", async () => {
      clackState.groupImpl.mockRejectedValue(new Error("clack failure"));

      const exit = await Effect.runPromiseExit(who("?"));

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(JSON.stringify(exit.cause)).toContain("PromptError");
      }
    });
  });

  describe("selection()", () => {
    it("delegates to clack.select via group and returns the choice", async () => {
      clackState.groupImpl.mockImplementation(
        async (fields: Record<string, () => Promise<unknown>>) => {
          clackState.selectImpl.mockResolvedValue("opt-2");
          const selectionValue = await fields["selection"]!();
          return { selection: selectionValue };
        },
      );

      const result = await Effect.runPromise(
        selection("pick one", [
          { value: "opt-1", label: "One" },
          { value: "opt-2", label: "Two" },
        ]),
      );

      expect(result).toEqual({ selection: "opt-2" });
      expect(clack.select).toHaveBeenCalledTimes(1);
    });

    it("wraps a thrown error in PromptError", async () => {
      clackState.groupImpl.mockRejectedValue(new Error("kaboom"));

      const exit = await Effect.runPromiseExit(
        selection("?", [{ value: "a", label: "A" }]),
      );

      expect(Exit.isFailure(exit)).toBe(true);
    });
  });

  describe("multiple()", () => {
    it("delegates to autocompleteMultiselect and returns selected values", async () => {
      clackState.groupImpl.mockImplementation(
        async (fields: Record<string, () => Promise<unknown>>) => {
          clackState.autocompleteImpl.mockResolvedValue(["a", "c"]);
          const sel = await fields["selection"]!();
          return { selection: sel };
        },
      );

      const result = await Effect.runPromise(
        multiple("pick many", [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
          { value: "c", label: "C" },
        ]),
      );

      expect(result).toEqual({ selection: ["a", "c"] });
      expect(clack.autocompleteMultiselect).toHaveBeenCalledTimes(1);
    });

    it("wraps a thrown error in PromptError", async () => {
      clackState.groupImpl.mockRejectedValue(new Error("boom"));

      const exit = await Effect.runPromiseExit(
        multiple("?", [{ value: "x", label: "X" }]),
      );

      expect(Exit.isFailure(exit)).toBe(true);
    });
  });

  describe("onCancel handler", () => {
    it("calls cancel and exits when the group is cancelled (via who)", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(((_code?: number) => undefined) as never);

      clackState.groupImpl.mockImplementation(
        async (
          _fields: unknown,
          opts: { onCancel?: () => void } | undefined,
        ) => {
          opts?.onCancel?.();
          return { name: "ignored" };
        },
      );

      await Effect.runPromise(who("?"));

      expect(clackState.cancelCalls[0]).toBe("Opération annulée.");
      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
    });
  });
});
