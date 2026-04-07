import { env } from '$env/dynamic/private';
import {
  fetchProjectLogs,
  enrichLogs,
  parseTokensCsv,
  computeRollingWindow,
  readCache,
  writeCache,
  isCacheStale,
  type RollingPoint,
} from '@univ-lehavre/atlas-redcap-logs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const tokensCsv = readFileSync(join(process.cwd(), '../../redcap-token.csv'), 'utf8');

const fetchAll = async (apiUrl: string): Promise<ReturnType<typeof enrichLogs>> => {
  const tokens = parseTokensCsv(tokensCsv);
  const results = await Promise.all(tokens.map((token) => fetchProjectLogs(apiUrl, token)));
  return enrichLogs(results.flat());
};

export const load = async (): Promise<{ rolling: RollingPoint[]; cachedAt: number | null }> => {
  const apiUrl = env.REDCAP_API_URL;

  const cache = await readCache();

  if (cache !== null && !isCacheStale(cache)) {
    const rolling = computeRollingWindow(enrichLogs(cache.logs));
    return { rolling, cachedAt: cache.savedAt };
  }

  // Cache is stale or absent — fetch fresh data
  const freshLogs = await fetchAll(apiUrl);

  // Only update cache if we got results
  if (freshLogs.length > 0) {
    const raw = freshLogs.map((e) => ({
      project_id: e.project_id,
      timestamp: e.timestamp.toISOString(),
      username: e.username,
      action: e.action,
    }));
    await writeCache(raw);
  }

  return {
    rolling: computeRollingWindow(freshLogs),
    cachedAt: freshLogs.length > 0 ? Date.now() : (cache?.savedAt ?? null),
  };
};
