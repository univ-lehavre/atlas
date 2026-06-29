import { describe, it, expect } from "vitest";

import { selectCacheLayer } from "./select.js";
import { isStale, DEFAULT_TTL_MS } from "./store.js";
import { dsnFromEnv } from "./postgres.js";

describe("selectCacheLayer", () => {
  it("returns a Layer for a postgres:// DSN", () => {
    // On vérifie seulement que la sélection produit un Layer (le branchement réel
    // est couvert par le test d'intégration hermétique). Pas de connexion ici.
    const layer = selectCacheLayer("postgres://u:p@pg-rw.postgres:5432/cache");
    expect(layer).toBeDefined();
  });

  it("returns a Layer for a postgresql:// DSN", () => {
    const layer = selectCacheLayer("postgresql://u:p@h:5432/cache");
    expect(layer).toBeDefined();
  });

  it("returns a Layer for a file path", () => {
    const layer = selectCacheLayer("/tmp/atlas-cache");
    expect(layer).toBeDefined();
  });
});

describe("isStale", () => {
  it("is false within the TTL", () => {
    expect(
      isStale({ savedAt: 1000, data: null }, 1000 + DEFAULT_TTL_MS - 1),
    ).toBe(false);
  });

  it("is true past the TTL", () => {
    expect(
      isStale({ savedAt: 1000, data: null }, 1000 + DEFAULT_TTL_MS + 1),
    ).toBe(true);
  });

  it("honors a custom TTL", () => {
    expect(isStale({ savedAt: 0, data: null }, 50, 100)).toBe(false);
    expect(isStale({ savedAt: 0, data: null }, 150, 100)).toBe(true);
  });
});

describe("dsnFromEnv", () => {
  const full = {
    POSTGRES_CACHE_HOST: "pg-rw.postgres",
    POSTGRES_CACHE_PORT: "5432",
    POSTGRES_CACHE_DB: "cache",
    POSTGRES_CACHE_USER: "cache",
    POSTGRES_CACHE_PASSWORD: "secret",
  };

  it("composes a DSN from the POSTGRES_CACHE_* variables", () => {
    expect(dsnFromEnv(full)).toBe(
      "postgres://cache:secret@pg-rw.postgres:5432/cache",
    );
  });

  it("returns null when any variable is missing", () => {
    const partial = { ...full, POSTGRES_CACHE_PASSWORD: undefined };
    expect(dsnFromEnv(partial)).toBeNull();
  });

  it("returns null for an empty environment", () => {
    expect(dsnFromEnv({})).toBeNull();
  });
});
