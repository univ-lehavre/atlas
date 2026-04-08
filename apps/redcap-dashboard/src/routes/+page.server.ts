import {
  enrichLogs,
  computeMonthlyCalendar,
  readCache,
  type MonthlyPoint,
} from '@univ-lehavre/atlas-redcap-logs';
import { applyPatches } from '$lib/patches.js';

export const load = async (): Promise<{ monthly: MonthlyPoint[]; cachedAt: number | null }> => {
  const cache = await readCache();
  return cache !== null
    ? {
        monthly: computeMonthlyCalendar(applyPatches(enrichLogs(cache.logs))),
        cachedAt: cache.savedAt,
      }
    : { monthly: [], cachedAt: null };
};
