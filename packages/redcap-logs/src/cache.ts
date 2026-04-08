import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RawLog } from "./api.js";

const CACHE_PATH = path.resolve(process.cwd(), ".redcap-stats.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface CacheFile {
  readonly savedAt: number;
  readonly logs: RawLog[];
}

const readCacheFile = (): Promise<string | null> =>
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  readFile(CACHE_PATH, "utf8").then(
    (content) => content,
    () => null,
  );

export const readCache = (): Promise<CacheFile | null> =>
  readCacheFile().then((raw) =>
    raw === null ? null : (JSON.parse(raw) as CacheFile),
  );

export const writeCache = (logs: RawLog[]): Promise<void> =>
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  writeFile(
    CACHE_PATH,
    `${JSON.stringify({ savedAt: Date.now(), logs }, null, 2)}\n`,
    "utf8",
  );

export const isCacheStale = (cache: CacheFile): boolean =>
  Date.now() - cache.savedAt > CACHE_TTL_MS;
