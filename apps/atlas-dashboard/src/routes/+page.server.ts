import { readCache } from '$lib/cache.js';

export const load = async (): Promise<{ cachedAt: number | null }> => {
  const cache = await readCache();
  return { cachedAt: cache?.savedAt ?? null };
};
