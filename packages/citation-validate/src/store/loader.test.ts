import { it, describe, expect, afterEach, beforeEach } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { loadStores } from "./loader.js";
import { EventsStore, ContextStore } from "./init.js";
import type { IEvent } from "../events/types.js";
import type { IContext } from "../context/types.js";
import type { CitationID, ORCID } from "@univ-lehavre/atlas-citation-types";

const orcid = "0000-0001-2345-6789" as unknown as ORCID;

const initialContext: IContext = {
  type: "none",
  id: undefined,
  NAMESPACE: "ns",
  backup: false,
};

const makeEvent = (overrides: Partial<IEvent> = {}): IEvent => ({
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  dataIntegrity: "hash",
  hasBeenExtendedAt: "never",
  status: "pending",
  from: "A1" as unknown as CitationID,
  id: orcid,
  entity: "author",
  field: "affiliation",
  value: "I1",
  ...overrides,
});

let ctxFile: string;
let eventsFile: string;
let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  const ts = Date.now();
  ctxFile = join(tmpdir(), `atlas-ctx-${ts}.json`);
  eventsFile = join(tmpdir(), `atlas-events-${ts}.json`);
  savedEnv = {
    CONTEXT_FILE: process.env["CONTEXT_FILE"],
    EVENTS_FILE: process.env["EVENTS_FILE"],
  };
  process.env["CONTEXT_FILE"] = ctxFile;
  process.env["EVENTS_FILE"] = eventsFile;
});

afterEach(() => {
  process.env["CONTEXT_FILE"] = savedEnv["CONTEXT_FILE"];
  process.env["EVENTS_FILE"] = savedEnv["EVENTS_FILE"];
  if (existsSync(ctxFile)) unlinkSync(ctxFile);
  if (existsSync(eventsFile)) unlinkSync(eventsFile);
});

describe("loadStores", () => {
  it.effect("loads context and events from existing files", () =>
    Effect.gen(function* () {
      const context: IContext = {
        ...initialContext,
        type: "author",
        id: orcid,
      };
      const events = [makeEvent({ value: "loaded" })];
      writeFileSync(ctxFile, JSON.stringify(context));
      writeFileSync(eventsFile, JSON.stringify(events));

      const ctxRef = yield* Ref.make(initialContext);
      const eventsRef = yield* Ref.make<IEvent[]>([]);

      yield* loadStores().pipe(
        Effect.provideService(ContextStore, ctxRef),
        Effect.provideService(EventsStore, eventsRef),
      );

      const loadedCtx = yield* Ref.get(ctxRef);
      const loadedEvents = yield* Ref.get(eventsRef);
      expect(loadedCtx.type).toBe("author");
      expect(loadedEvents).toHaveLength(1);
      expect(loadedEvents[0]!.value).toBe("loaded");
    }),
  );

  it.effect("leaves stores unchanged when files do not exist", () =>
    Effect.gen(function* () {
      const ctxRef = yield* Ref.make(initialContext);
      const eventsRef = yield* Ref.make<IEvent[]>([]);

      yield* loadStores().pipe(
        Effect.provideService(ContextStore, ctxRef),
        Effect.provideService(EventsStore, eventsRef),
      );

      const ctx = yield* Ref.get(ctxRef);
      const events = yield* Ref.get(eventsRef);
      expect(ctx.type).toBe("none");
      expect(events).toEqual([]);
    }),
  );

  it.effect("fails when context file contains invalid JSON", () =>
    Effect.gen(function* () {
      writeFileSync(ctxFile, "not-json{{{");
      writeFileSync(eventsFile, "[]");

      const ctxRef = yield* Ref.make(initialContext);
      const eventsRef = yield* Ref.make<IEvent[]>([]);

      const result = yield* Effect.either(
        loadStores().pipe(
          Effect.provideService(ContextStore, ctxRef),
          Effect.provideService(EventsStore, eventsRef),
        ),
      );
      expect(result._tag).toBe("Left");
    }),
  );
});
