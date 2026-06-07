import { describe, it, expect } from "@effect/vitest";
import { Context, Effect } from "effect";
import { makeRecorder, recordingLayer, TestLoggerLayer } from "./index.js";

// A sample service used to exercise recordingLayer.
interface Greeter {
  readonly greet: (name: string) => Effect.Effect<string>;
  readonly prefix: string;
}
class GreeterService extends Context.Tag("test/Greeter")<
  GreeterService,
  Greeter
>() {}

describe("test-utils-effect", () => {
  describe("makeRecorder", () => {
    it("records calls and exposes per-method accessors", () => {
      const rec = makeRecorder();
      expect(rec.calls).toEqual([]);
      expect(rec.called("greet")).toBe(false);
      // A standalone recorder is appended to by the double the test builds.
      // Here we just verify reset() and the empty-state accessors.
      rec.reset();
      expect(rec.countTo("greet")).toBe(0);
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

  describe("TestLoggerLayer", () => {
    it("is a defined layer (re-export of the socle quiet logger)", () => {
      expect(TestLoggerLayer).toBeDefined();
    });
  });
});
