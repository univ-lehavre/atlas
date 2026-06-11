import { describe, it, expect } from "@effect/vitest";
import { createHash } from "node:crypto";

import { MANIFEST_SCHEMA_VERSION } from "@univ-lehavre/atlas-citation-types";
import { Effect, Exit } from "effect";

import { validateManifest, verifyPart } from "./index.js";

const SHA = "a".repeat(64);

const validManifest = {
  partition: "dt=2026-06/run=abc123",
  schema_version: MANIFEST_SCHEMA_VERSION,
  row_count: 1,
  parts: [
    {
      key: "marts/collab/dt=2026-06/run=abc123/part.parquet",
      sha256: SHA,
      bytes: 1006,
    },
  ],
  produced_at: "2026-06-11T00:00:00+00:00",
};

describe("validateManifest", () => {
  it.effect("accepte un manifest conforme et le renvoie typé", () =>
    Effect.gen(function* () {
      const manifest = yield* validateManifest(validManifest);
      expect(manifest.partition).toBe("dt=2026-06/run=abc123");
      expect(manifest.schema_version).toBe(MANIFEST_SCHEMA_VERSION);
      expect(manifest.parts).toHaveLength(1);
      expect(manifest.parts[0]?.sha256).toBe(SHA);
    }),
  );

  it.effect("REFUSE une schema_version inconnue (pas de best-effort)", () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(
        validateManifest({ ...validManifest, schema_version: 999 }),
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(exit.cause.toString()).toContain("schema_version inconnue");
      }
    }),
  );

  it.effect("REFUSE un manifest mal formé (champ manquant)", () =>
    Effect.gen(function* () {
      const incomplete: Record<string, unknown> = { ...validManifest };
      delete incomplete["partition"];
      const exit = yield* Effect.exit(validateManifest(incomplete));
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(exit.cause.toString()).toContain("Manifest mal formé");
      }
    }),
  );

  it.effect("REFUSE un sha256 non hexadécimal (forme de part invalide)", () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(
        validateManifest({
          ...validManifest,
          parts: [{ key: "k", sha256: "pas-un-hash", bytes: 1 }],
        }),
      );
      expect(Exit.isFailure(exit)).toBe(true);
    }),
  );

  it.effect("REFUSE une entrée non-objet (manifest absent/illisible)", () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(validateManifest(null));
      expect(Exit.isFailure(exit)).toBe(true);
    }),
  );
});

describe("verifyPart", () => {
  it.effect("accepte des octets dont le sha256 correspond", () =>
    Effect.gen(function* () {
      const bytes = new TextEncoder().encode("PARTDATA");
      const sha = createHash("sha256").update(bytes).digest("hex");
      yield* verifyPart(bytes, sha); // ne lève pas
    }),
  );

  it.effect("REFUSE des octets dont le sha256 diffère (intégrité)", () =>
    Effect.gen(function* () {
      const bytes = new TextEncoder().encode("PARTDATA");
      const exit = yield* Effect.exit(verifyPart(bytes, SHA));
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(exit.cause.toString()).toContain("sha256 invalide");
      }
    }),
  );
});
