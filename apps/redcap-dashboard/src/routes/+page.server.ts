import {
  enrichLogs,
  computeMonthlyCalendar,
  readCache,
  type MonthlyPoint,
} from '@univ-lehavre/atlas-redcap-logs';

export const load = async (): Promise<{ monthly: MonthlyPoint[]; cachedAt: number | null }> => {
  const cache = await readCache();
  return cache !== null
    ? { monthly: computeMonthlyCalendar(enrichLogs(cache.logs)), cachedAt: cache.savedAt }
    : { monthly: [], cachedAt: null };
};
