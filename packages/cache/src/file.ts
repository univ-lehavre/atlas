import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import path from "node:path";

import { Effect, Layer } from "effect";

import { CacheError } from "./errors.js";
import { CacheStore } from "./store.js";
import type { CacheEntry } from "./store.js";

/**
 * Back-end **fichier** du cache (ADR 0040 : fallback local mono-instance
 * uniquement, jamais une cible de production). Une entrée = un fichier
 * `<baseDir>/<key>.json` portant `{ savedAt, data }`.
 *
 * Écriture **atomique** (tmp propre au processus + `rename`), reprise de
 * `atlas-stats` : un lecteur ne voit jamais un fichier à moitié écrit, et deux
 * écrivains concourants ne se corrompent pas (dernier `rename` gagne).
 */

const entryPath = (baseDir: string, key: string): string =>
  path.join(baseDir, `${key}.json`);

const parseEntry = <T>(raw: string): CacheEntry<T> | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>)["savedAt"] === "number" &&
      "data" in parsed
    ) {
      return parsed as CacheEntry<T>;
    }
    return null;
  } catch {
    return null;
  }
};

const cacheError =
  (message: string) =>
  (cause: unknown): CacheError =>
    new CacheError({ message, cause });

const makeFileStore = (baseDir: string): CacheStore => ({
  get: <T>(key: string) =>
    Effect.tryPromise({
      try: () => readFile(entryPath(baseDir, key), "utf8"),
      catch: cacheError("read failed"),
    }).pipe(
      // Un fichier absent (ENOENT) n'est pas une erreur : c'est un cache vide.
      Effect.catchAll(() => Effect.succeed<string | null>(null)),
      Effect.map((raw) => (raw === null ? null : parseEntry<T>(raw))),
    ),

  set: <T>(key: string, data: T) =>
    Effect.tryPromise({
      try: async () => {
        await mkdir(baseDir, { recursive: true });
        const entry: CacheEntry<T> = { savedAt: Date.now(), data };
        const target = entryPath(baseDir, key);
        const tmp = `${target}.${String(process.pid)}.tmp`;
        await writeFile(tmp, JSON.stringify(entry, null, 2), "utf8");
        await rename(tmp, target);
      },
      catch: cacheError("write failed"),
    }),
});

/** Layer du back-end fichier, ancré sur `baseDir`. */
export const FileCacheLayer = (baseDir: string): Layer.Layer<CacheStore> =>
  Layer.succeed(CacheStore, makeFileStore(baseDir));
