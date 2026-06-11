import { describe, it, expect } from "vitest";

import { MANIFEST_SCHEMA_VERSION } from "./manifest.js";

describe("MANIFEST_SCHEMA_VERSION", () => {
  it("vaut 1 — MIROIR de la constante Python (dataops, étape 3.4)", () => {
    // Le producteur Python fixe MANIFEST_SCHEMA_VERSION = 1. Ce test verrouille le
    // miroir : tout bump de schéma doit être fait des DEUX côtés simultanément.
    expect(MANIFEST_SCHEMA_VERSION).toBe(1);
  });
});
