import { readCache, isCacheStale } from '$lib/cache.js';
import type { NpmPackageMeta } from '$lib/types.js';

export const load = async (): Promise<{
  cachedAt: number | null;
  stale: boolean;
  loadedAt: number;
  packages: NpmPackageMeta[];
}> => {
  const cache = await readCache();
  return {
    cachedAt: cache?.savedAt ?? null,
    stale: cache === null || isCacheStale(cache),
    loadedAt: Date.now(),
    packages: cache?.packages ?? [],
  };
};
