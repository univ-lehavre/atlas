import { Effect } from "effect";

import { CacheStore } from "./store.js";
import { PostgresCacheLayer } from "./postgres.js";

/**
 * État de bridage d'actualisation **partagé** (ADR 0083), adossé au même back-end
 * Postgres que le cache : l'horodatage `lastRefreshAt` vit dans la table
 * `flux_cache` sous une clé dédiée, lisible par toutes les instances. C'est la
 * moitié *partageable* d'un coordinateur d'actualisation — la promesse en vol,
 * elle, reste locale au processus (non sérialisable).
 *
 * Le consommateur (atlas-dashboard) assemble ces deux primitives avec son
 * `inFlight` local pour satisfaire son interface `RefreshCoordinator`.
 */
export interface PgRefreshState {
  /** Lit l'horodatage (ms) de la dernière actualisation aboutie (0 si jamais). */
  readonly getLastRefreshAt: () => Promise<number>;
  /** Persiste l'horodatage (ms) de la dernière actualisation aboutie. */
  readonly setLastRefreshAt: (at: number) => Promise<void>;
}

interface Stamp {
  readonly at: number;
}

/** Crée l'état de bridage partagé Postgres pour une clé donnée (par défaut `<key>:lastRefreshAt`). */
export const createPgRefreshState = (
  dsn: string,
  key = "refresh:lastRefreshAt",
): PgRefreshState => {
  const getLastRefreshAt = (): Promise<number> => {
    const program = Effect.gen(function* () {
      const store = yield* CacheStore;
      const entry = yield* store.get<Stamp>(key);
      return entry === null ? 0 : entry.data.at;
    });
    return Effect.runPromise(
      program.pipe(Effect.scoped, Effect.provide(PostgresCacheLayer(dsn))),
    );
  };

  const setLastRefreshAt = (at: number): Promise<void> => {
    const program = Effect.gen(function* () {
      const store = yield* CacheStore;
      yield* store.set<Stamp>(key, { at });
    });
    return Effect.runPromise(
      program.pipe(Effect.scoped, Effect.provide(PostgresCacheLayer(dsn))),
    );
  };

  return { getLastRefreshAt, setLastRefreshAt };
};
