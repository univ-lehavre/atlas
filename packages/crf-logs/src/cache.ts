import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import { Effect } from "effect";
import {
  CacheStore,
  PostgresCacheLayer,
  type CacheEntry,
} from "@univ-lehavre/atlas-cache";

import type { RawLog } from "./api.js";

const CACHE_FILE = ".crf-stats.json";
const WORKSPACE_MARKER = "pnpm-workspace.yaml";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_KEY = "crf-logs";
const POSTGRES_DSN = /^postgres(?:ql)?:\/\//;

export interface CacheFile {
  readonly savedAt: number;
  readonly logs: RawLog[];
}

/**
 * Back-end Postgres si `CRF_LOGS_CACHE_PATH` est une DSN `postgres://…`
 * (ADR 0083, sélection explicite) ; sinon `null` → comportement fichier inchangé.
 */
const postgresDsn = (): string | null => {
  const fromEnv = process.env["CRF_LOGS_CACHE_PATH"];
  return fromEnv !== undefined && POSTGRES_DSN.test(fromEnv) ? fromEnv : null;
};

const readFromPostgres = (dsn: string): Promise<CacheFile | null> => {
  const program = Effect.gen(function* () {
    const store = yield* CacheStore;
    const entry: CacheEntry<RawLog[]> | null =
      yield* store.get<RawLog[]>(CACHE_KEY);
    return entry === null ? null : { savedAt: entry.savedAt, logs: entry.data };
  });
  return Effect.runPromise(
    program.pipe(Effect.scoped, Effect.provide(PostgresCacheLayer(dsn))),
  );
};

const writeToPostgres = (dsn: string, logs: RawLog[]): Promise<void> => {
  const program = Effect.gen(function* () {
    const store = yield* CacheStore;
    yield* store.set<RawLog[]>(CACHE_KEY, logs);
  });
  return Effect.runPromise(
    program.pipe(Effect.scoped, Effect.provide(PostgresCacheLayer(dsn))),
  );
};

/**
 * Remonte jusqu'à la racine du workspace (marqueur `pnpm-workspace.yaml`) pour
 * y ancrer le cache par défaut — afin que toutes les instances locales lisent
 * le même fichier quel que soit le `cwd` du processus. Repli sur `cwd` si la
 * racine n'est pas trouvée. Récursif (pas de boucle mutable) pour rester
 * conforme au preset fonctionnel strict.
 */
const findWorkspaceRoot = (cursor: string): string | null => {
  if (existsSync(path.join(cursor, WORKSPACE_MARKER))) return cursor;
  const parent = path.dirname(cursor);
  return parent === cursor ? null : findWorkspaceRoot(parent);
};

const resolveWorkspaceRoot = (): string =>
  findWorkspaceRoot(process.cwd()) ?? process.cwd();

/**
 * Chemin du cache, **injectable par environnement** (ADR 0040 : un cache n'est
 * pas un chemin codé en dur). `CRF_LOGS_CACHE_PATH` désigne la ressource ; à
 * défaut, on retombe sur un fichier à la racine du workspace (local
 * mono-instance uniquement — jamais une cible de production). Même mécanisme
 * que `ATLAS_STATS_CACHE_PATH` côté `atlas-stats`.
 */
const resolveCachePath = (): string => {
  const fromEnv = process.env["CRF_LOGS_CACHE_PATH"];
  if (fromEnv !== undefined && fromEnv.trim() !== "") {
    return path.resolve(fromEnv);
  }
  return path.resolve(resolveWorkspaceRoot(), CACHE_FILE);
};

const isValidCache = (raw: unknown): raw is CacheFile =>
  typeof raw === "object" &&
  raw !== null &&
  typeof (raw as Record<string, unknown>)["savedAt"] === "number" &&
  Array.isArray((raw as Record<string, unknown>)["logs"]);

const parseCache = (raw: string): CacheFile | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidCache(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const readCacheFile = (): Promise<string | null> =>
  readFile(resolveCachePath(), "utf8").then(
    (content) => content,
    () => null,
  );

export const readCache = (): Promise<CacheFile | null> => {
  const dsn = postgresDsn();
  if (dsn !== null) return readFromPostgres(dsn);
  return readCacheFile().then((raw) => (raw === null ? null : parseCache(raw)));
};

export const writeCache = (logs: RawLog[]): Promise<void> => {
  const dsn = postgresDsn();
  if (dsn !== null) return writeToPostgres(dsn, logs);
  return writeFile(
    resolveCachePath(),
    `${JSON.stringify({ savedAt: Date.now(), logs }, null, 2)}\n`,
    "utf8",
  );
};

export const isCacheStale = (cache: CacheFile): boolean =>
  Date.now() - cache.savedAt > CACHE_TTL_MS;
