import { Context, Effect } from "effect";

import type { CacheError } from "./errors.js";

/**
 * Entrée de cache : un payload `data` horodaté par le store (`savedAt`, ms epoch).
 * Le store est l'autorité du `savedAt` — l'appelant ne fournit que `data`, ce qui
 * garantit une **source unique** pour le TTL (ADR 0083 : pas de double-vérité
 * horloge JS ↔ back-end).
 */
export interface CacheEntry<T> {
  readonly savedAt: number;
  readonly data: T;
}

/**
 * Service de cache clé-valeur (ADR 0040/0083). Une seule interface, plusieurs
 * back-ends (fichier local mono-instance, Postgres CNPG partagé) fournis comme
 * `Layer`. Le payload est opaque (sérialisé/désérialisé par le store) ; chaque
 * consommateur range le sien sous une clé stable (`"atlas-stats"`, `"crf-logs"`).
 */
export interface CacheStore {
  /** Lit l'entrée sous `key`, ou `null` si absente/illisible. */
  readonly get: <T>(
    key: string,
  ) => Effect.Effect<CacheEntry<T> | null, CacheError>;
  /** Écrit `data` sous `key` de façon atomique, en l'horodatant. */
  readonly set: <T>(key: string, data: T) => Effect.Effect<void, CacheError>;
}

export const CacheStore = Context.GenericTag<CacheStore>(
  "@univ-lehavre/atlas-cache/CacheStore",
);

/** TTL par défaut : 24 h (aligné sur l'existant `atlas-stats`/`crf-logs`). */
export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/** Une entrée est périmée si son `savedAt` dépasse le TTL — jugé sur le `savedAt` du store. */
export const isStale = (
  entry: CacheEntry<unknown>,
  now: number,
  ttlMs: number = DEFAULT_TTL_MS,
): boolean => now - entry.savedAt > ttlMs;
