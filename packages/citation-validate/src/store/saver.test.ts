import { it, describe, expect, afterEach, beforeEach } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { saveContextStore, saveEventsStore, saveStores } from "./saver.js";
import { EventsStore, ContextStore } from "./init.js";
import type { IEvent } from "../events/types.js";
import type { IContext } from "../context/types.js";
import type { CitationID, ORCID } from "@univ-lehavre/atlas-citation-types";

const orcid = "0000-0001-2345-6789" as unknown as ORCID;

const makeContext = (overrides: Partial<IContext> = {}): IContext => ({
  type: "author",
  id: orcid,
  NAMESPACE: "ns",
  backup: false,
  ...overrides,
});

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

let tmpDir: string;
let ctxFile: string;
let eventsFile: string;
let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "atlas-save-"));
  ctxFile = join(tmpDir, "ctx.json");
  eventsFile = join(tmpDir, "events.json");
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
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("saveContextStore", () => {
  it.effect("writes context to file", () =>
    Effect.gen(function* () {
      const ctx = makeContext();
      const ctxRef = yield* Ref.make(ctx);

      yield* saveContextStore().pipe(
        Effect.provideService(ContextStore, ctxRef),
      );

      const written = JSON.parse(readFileSync(ctxFile, "utf-8")) as IContext;
      expect(written.type).toBe("author");
    }),
  );
});

describe("saveEventsStore", () => {
  it.effect("writes events to file", () =>
    Effect.gen(function* () {
      const ctx = makeContext();
      const events = [makeEvent({ value: "saved" })];
      const ctxRef = yield* Ref.make(ctx);
      const eventsRef = yield* Ref.make(events);

      yield* saveEventsStore().pipe(
        Effect.provideService(ContextStore, ctxRef),
        Effect.provideService(EventsStore, eventsRef),
      );

      const written = JSON.parse(readFileSync(eventsFile, "utf-8")) as IEvent[];
      expect(written).toHaveLength(1);
      expect(written[0]!.value).toBe("saved");
    }),
  );
});

describe("saveStores", () => {
  it.effect("writes both context and events", () =>
    Effect.gen(function* () {
      const ctx = makeContext();
      const events = [makeEvent()];
      const ctxRef = yield* Ref.make(ctx);
      const eventsRef = yield* Ref.make(events);

      yield* saveStores().pipe(
        Effect.provideService(ContextStore, ctxRef),
        Effect.provideService(EventsStore, eventsRef),
      );

      expect(existsSync(ctxFile)).toBe(true);
      expect(existsSync(eventsFile)).toBe(true);
    }),
  );
});

describe("saveContextStore with backup", () => {
  it.effect(
    "creates a backup copy when backup=true and file already exists",
    () =>
      Effect.gen(function* () {
        writeFileSync(ctxFile, JSON.stringify({ existing: true }), "utf-8");
        const ctx = makeContext({ backup: true });
        const ctxRef = yield* Ref.make(ctx);

        yield* saveContextStore().pipe(
          Effect.provideService(ContextStore, ctxRef),
        );

        const written = JSON.parse(readFileSync(ctxFile, "utf-8")) as IContext;
        expect(written.type).toBe("author");
      }),
  );
});
