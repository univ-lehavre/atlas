import { env } from '$env/dynamic/private';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import {
  fetchProjectLogs,
  enrichLogs,
  parseTokensCsv,
  computeRollingWindow,
  readCache,
  writeCache,
  isCacheStale,
  type RollingPoint,
  type RawLog,
} from '@univ-lehavre/atlas-redcap-logs';

const TOKENS_PATH = path.resolve(import.meta.dirname, '../../../../redcap-token.csv');
const CACHE_PATH = path.join(homedir(), '.redcap-stats.json');

const toRawLog = (e: ReturnType<typeof enrichLogs>[number]): RawLog => ({
  project_id: e.project_id,
  timestamp: e.timestamp.toISOString(),
  username: e.username,
  action: e.action,
});

const fetchAll = async (apiUrl: string): Promise<ReturnType<typeof enrichLogs>> => {
  const tokensCsv = readFileSync(TOKENS_PATH, 'utf8');
  const tokens = parseTokensCsv(tokensCsv);
  const results = await Promise.all(tokens.map((token) => fetchProjectLogs(apiUrl, token)));
  return enrichLogs(results.flat());
};

const updateCacheIfNeeded = async (
  freshLogs: ReturnType<typeof enrichLogs>,
  cachedCount: number
): Promise<boolean> => {
  const hasNewData = freshLogs.length > cachedCount;
  if (hasNewData) await writeCache(freshLogs.map(toRawLog));
  return hasNewData;
};

const buildResult = async (
  apiUrl: string,
  forceRefresh = false
): Promise<{ rolling: RollingPoint[]; cachedAt: number | null }> => {
  const cache = forceRefresh ? null : await readCache();

  if (cache !== null && !isCacheStale(cache)) {
    return { rolling: computeRollingWindow(enrichLogs(cache.logs)), cachedAt: cache.savedAt };
  }

  const freshLogs = await fetchAll(apiUrl);
  const hasNewData = await updateCacheIfNeeded(freshLogs, cache?.logs.length ?? 0);

  return {
    rolling: computeRollingWindow(freshLogs),
    cachedAt: hasNewData ? Date.now() : (cache?.savedAt ?? null),
  };
};

export const load = (): Promise<{ rolling: RollingPoint[]; cachedAt: number | null }> =>
  buildResult(env.REDCAP_API_URL);

export const actions = {
  refresh: async () => {
    await unlink(CACHE_PATH).catch(() => null);
    return buildResult(env.REDCAP_API_URL, true);
  },
};
