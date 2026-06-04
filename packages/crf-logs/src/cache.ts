import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { RawLog } from "./api.js";

const CACHE_FILE = ".crf-stats.json";
const WORKSPACE_MARKER = "pnpm-workspace.yaml";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface CacheFile {
  readonly savedAt: number;
  readonly logs: RawLog[];
}

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

export const readCache = (): Promise<CacheFile | null> =>
  readCacheFile().then((raw) => (raw === null ? null : parseCache(raw)));

export const writeCache = (logs: RawLog[]): Promise<void> =>
  writeFile(
    resolveCachePath(),
    `${JSON.stringify({ savedAt: Date.now(), logs }, null, 2)}\n`,
    "utf8",
  );

export const isCacheStale = (cache: CacheFile): boolean =>
  Date.now() - cache.savedAt > CACHE_TTL_MS;
