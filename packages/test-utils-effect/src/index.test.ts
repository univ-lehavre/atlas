import { describe, it, expect } from "@effect/vitest";
import { Context, Effect } from "effect";
import {
  makeRecorder,
  recordingLayer,
  recordingFnLayer,
  TestLoggerLayer,
} from "./index.js";

// A sample service used to exercise recordingLayer.
interface Greeter {
  readonly greet: (name: string) => Effect.Effect<string>;
  readonly prefix: string;
}
class GreeterService extends Context.Tag("test/Greeter")<
  GreeterService,
  Greeter
>() {}

// A function-shaped service (bare callable) for recordingFnLayer.
type Adder = (a: number, b: number) => Effect.Effect<number>;
class AdderService extends Context.Tag("test/Adder")<AdderService, Adder>() {}

describe("test-utils-effect", () => {
  describe("makeRecorder", () => {
    it("records calls via the append handle and exposes per-method accessors", () => {
      const { recorder, record } = makeRecorder();
      expect(recorder.calls).toEqual([]);
      expect(recorder.called("greet")).toBe(false);

      // A standalone recorder is appended to by the hand-built double.
      record("greet", ["ada"]);
      record("greet", ["alan"]);
      record("bye", []);

      expect(recorder.countTo("greet")).toBe(2);
      expect(recorder.called("greet")).toBe(true);
      expect(recorder.callsTo("greet")).toEqual([["ada"], ["alan"]]);
      expect(recorder.calls).toEqual([
        ["greet", "ada"],
        ["greet", "alan"],
        ["bye"],
      ]);

      recorder.reset();
      expect(recorder.calls).toEqual([]);
      expect(recorder.countTo("greet")).toBe(0);
    });
  });

  describe("recordingLayer", () => {
    it.effect("records each call while delegating to the implementation", () =>
      Effect.gen(function* () {
        const { layer, recorder } = recordingLayer(GreeterService, {
          greet: (name: string) => Effect.succeed(`hi ${name}`),
          prefix: "hi",
        });

        const program = Effect.gen(function* () {
          const svc = yield* GreeterService;
          const a = yield* svc.greet("ada");
          const b = yield* svc.greet("alan");
          return [a, b, svc.prefix] as const;
        });

        const [a, b, prefix] = yield* program.pipe(Effect.provide(layer));

        // Delegation: the real implementation still runs.
        expect(a).toBe("hi ada");
        expect(b).toBe("hi alan");
        expect(prefix).toBe("hi");

        // Recording: every call captured in order, layer-native replacement
        // for vi.mocked(fn).mock.calls.
        expect(recorder.countTo("greet")).toBe(2);
        expect(recorder.called("greet")).toBe(true);
        expect(recorder.callsTo("greet")).toEqual([["ada"], ["alan"]]);
        expect(recorder.calls).toEqual([
          ["greet", "ada"],
          ["greet", "alan"],
        ]);
      }),
    );

    it.effect("reset clears recorded calls", () =>
      Effect.gen(function* () {
        const { layer, recorder } = recordingLayer(GreeterService, {
          greet: (name: string) => Effect.succeed(name),
          prefix: "",
        });
        yield* Effect.gen(function* () {
          const svc = yield* GreeterService;
          yield* svc.greet("x");
        }).pipe(Effect.provide(layer));
        expect(recorder.countTo("greet")).toBe(1);
        recorder.reset();
        expect(recorder.calls).toEqual([]);
      }),
    );
  });

  describe("recordingFnLayer", () => {
    it.effect("records calls to a bare-function service while delegating", () =>
      Effect.gen(function* () {
        const { layer, recorder } = recordingFnLayer(
          AdderService,
          (a: number, b: number) => Effect.succeed(a + b),
        );

        const out = yield* Effect.gen(function* () {
          const add = yield* AdderService;
          const x = yield* add(2, 3);
          const y = yield* add(10, 1);
          return [x, y] as const;
        }).pipe(Effect.provide(layer));

        expect(out).toEqual([5, 11]);
        expect(recorder.countTo("call")).toBe(2);
        expect(recorder.callsTo("call")).toEqual([
          [2, 3],
          [10, 1],
        ]);
      }),
    );

    it.effect("honours a custom recordedAs label", () =>
      Effect.gen(function* () {
        const { layer, recorder } = recordingFnLayer(
          AdderService,
          (a: number, b: number) => Effect.succeed(a + b),
          "add",
        );
        yield* Effect.gen(function* () {
          const add = yield* AdderService;
          yield* add(1, 1);
        }).pipe(Effect.provide(layer));
        expect(recorder.called("add")).toBe(true);
        expect(recorder.called("call")).toBe(false);
      }),
    );
  });

  describe("TestLoggerLayer", () => {
    it("is a defined layer (re-export of the socle quiet logger)", () => {
      expect(TestLoggerLayer).toBeDefined();
    });
  });
});
