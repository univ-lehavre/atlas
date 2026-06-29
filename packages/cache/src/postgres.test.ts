import { describe, it, expect } from "vitest";
import { Effect, Exit } from "effect";

import { PostgresCacheLayer } from "./postgres.js";
import { CacheStore } from "./store.js";
import { CacheError } from "./errors.js";

/**
 * Tests unitaires du back-end Postgres SANS serveur (hermétiques, indépendants de
 * Docker — pour que la couverture tienne en CI même sans conteneur). On vise les
 * chemins d'erreur : une DSN injoignable fait échouer `ensureTable` à
 * l'acquisition du Layer, en `CacheError` typée (jamais une fuite brute).
 *
 * Le round-trip nominal (DDL/UPSERT/JSONB) est couvert par
 * `postgres.integration.test.ts` sur un vrai PostgreSQL épinglé.
 */
describe("PostgresCacheLayer (sans serveur)", () => {
  // Port 1 = jamais un Postgres ; la connexion échoue vite.
  const deadDsn = "postgres://u:p@127.0.0.1:1/none?connect_timeout=1";

  it("fails the Layer with a typed CacheError when the server is unreachable", async () => {
    // L'acquisition du Layer crée la table (`ensureTable`) → échoue sur une DSN
    // injoignable, en `CacheError` typée et non en erreur brute du driver.
    const program = Effect.gen(function* () {
      const store = yield* CacheStore;
      return yield* store.get("x");
    });
    const exit = await Effect.runPromiseExit(
      program.pipe(Effect.scoped, Effect.provide(PostgresCacheLayer(deadDsn))),
    );
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const failure = exit.cause._tag === "Fail" ? exit.cause.error : null;
      expect(failure).toBeInstanceOf(CacheError);
    }
  }, 20_000);
});
