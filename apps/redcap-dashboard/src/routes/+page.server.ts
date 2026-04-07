import {
  enrichLogs,
  computeRollingWindow,
  readCache,
  type RollingPoint,
} from '@univ-lehavre/atlas-redcap-logs';

export const load = async (): Promise<{ rolling: RollingPoint[]; cachedAt: number | null }> => {
  const cache = await readCache();
  return cache !== null
    ? { rolling: computeRollingWindow(enrichLogs(cache.logs)), cachedAt: cache.savedAt }
    : { rolling: [], cachedAt: null };
};
