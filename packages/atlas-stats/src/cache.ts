import { readFile, writeFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

import { Effect } from "effect";
import {
  CacheStore,
  PostgresCacheLayer,
  type CacheEntry,
} from "@univ-lehavre/atlas-cache";

import type { AtlasStatsCache } from "./types.js";

const CACHE_FILE = ".atlas-stats.json";
const WORKSPACE_MARKER = "pnpm-workspace.yaml";
const TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_KEY = "atlas-stats";
const POSTGRES_DSN = /^postgres(?:ql)?:\/\//;

/**
 * Back-end Postgres si `ATLAS_STATS_CACHE_PATH` est une DSN `postgres://…`
 * (ADR 0083, sélection explicite) ; sinon `null` → comportement fichier inchangé.
 */
const postgresDsn = (): string | null => {
  const fromEnv = process.env["ATLAS_STATS_CACHE_PATH"];
  return fromEnv !== undefined && POSTGRES_DSN.test(fromEnv) ? fromEnv : null;
};

const readFromPostgres = (dsn: string): Promise<AtlasStatsCache | null> => {
  const program = Effect.gen(function* () {
    const store = yield* CacheStore;
    const entry: CacheEntry<AtlasStatsCache> | null =
      yield* store.get<AtlasStatsCache>(CACHE_KEY);
    return entry === null ? null : entry.data;
  });
  return Effect.runPromise(
    program.pipe(Effect.scoped, Effect.provide(PostgresCacheLayer(dsn))),
  );
};

const writeToPostgres = (dsn: string, data: AtlasStatsCache): Promise<void> => {
  const program = Effect.gen(function* () {
    const store = yield* CacheStore;
    yield* store.set<AtlasStatsCache>(CACHE_KEY, data);
  });
  return Effect.runPromise(
    program.pipe(Effect.scoped, Effect.provide(PostgresCacheLayer(dsn))),
  );
};

const resolveWorkspaceRoot = (): string => {
  let cursor = process.cwd();
  for (;;) {
    if (existsSync(path.join(cursor, WORKSPACE_MARKER))) return cursor;
    const parent = path.dirname(cursor);
    if (parent === cursor) return process.cwd();
    cursor = parent;
  }
};

const resolveCachePath = (): string => {
  const fromEnv = process.env["ATLAS_STATS_CACHE_PATH"];
  if (fromEnv !== undefined && fromEnv.trim() !== "") {
    return path.resolve(fromEnv);
  }
  return path.resolve(resolveWorkspaceRoot(), CACHE_FILE);
};

const isValidCache = (raw: unknown): raw is AtlasStatsCache =>
  typeof raw === "object" &&
  raw !== null &&
  typeof (raw as Record<string, unknown>)["savedAt"] === "number";

const parseCache = (raw: string): AtlasStatsCache | null => {
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

export const readCache = (): Promise<AtlasStatsCache | null> => {
  const dsn = postgresDsn();
  if (dsn !== null) return readFromPostgres(dsn);
  return readCacheFile().then((raw) => (raw === null ? null : parseCache(raw)));
};

/**
 * Écrit le cache de façon **atomique** : on écrit dans un fichier temporaire
 * propre au processus (`pid`), puis on `rename` vers la cible. Le `rename` est
 * atomique au niveau du système de fichiers, donc un lecteur ne voit jamais un
 * fichier à moitié écrit, et deux écrivains concourants ne se corrompent pas
 * mutuellement (le dernier `rename` gagne, sans état intermédiaire visible).
 * C'est la sûreté en concurrence atteignable sans backing-service partagé
 * (ADR 0040 : fallback fichier toléré en mono-instance ; un déploiement
 * multi-instance réel injectera une ressource partagée via l'environnement).
 */
export const writeCache = async (data: AtlasStatsCache): Promise<void> => {
  const dsn = postgresDsn();
  if (dsn !== null) return writeToPostgres(dsn, data);
  const target = resolveCachePath();
  // Nom temporaire IMPRÉVISIBLE + écriture EXCLUSIVE (`flag: "wx"`) : un autre
  // utilisateur ne peut pas pré-créer un symlink pour détourner l'écriture
  // (anti-TOCTOU, CodeQL js/insecure-temporary-file).
  const tmp = `${target}.${randomBytes(8).toString("hex")}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), {
    encoding: "utf8",
    flag: "wx",
  });
  await rename(tmp, target);
};

export const isCacheStale = (cache: AtlasStatsCache): boolean =>
  Date.now() - cache.savedAt > TTL_MS;
