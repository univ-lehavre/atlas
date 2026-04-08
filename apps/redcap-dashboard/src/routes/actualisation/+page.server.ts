import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  enrichLogs,
  isCacheStale,
  parseTokensCsv,
  readCache,
} from '@univ-lehavre/atlas-redcap-logs';

type ProjectStatus = 'OK' | 'WARN' | 'ERROR';

const TOKENS_PATH = path.resolve(import.meta.dirname, '../../../../../redcap-token.csv');
const DAY_MS = 24 * 60 * 60 * 1000;
const WARN_MAX_AGE_MS = DAY_MS;
const ERROR_MAX_AGE_MS = 3 * DAY_MS;

const computeProjectStatus = (lastUpdatedAt: number | null): ProjectStatus => {
  if (lastUpdatedAt === null) return 'ERROR';
  const age = Date.now() - lastUpdatedAt;
  if (age <= WARN_MAX_AGE_MS) return 'OK';
  if (age <= ERROR_MAX_AGE_MS) return 'WARN';
  return 'ERROR';
};

interface ProjectHealthRow {
  readonly projectId: number;
  readonly lastUpdatedAt: number | null;
  readonly status: ProjectStatus;
}

export const load = async (): Promise<{
  cachedAt: number | null;
  stale: boolean;
  loadedAt: number;
  projects: ProjectHealthRow[];
}> => {
  const cache = await readCache();
  const logs = cache === null ? [] : enrichLogs(cache.logs);
  const tokens = parseTokensCsv(readFileSync(TOKENS_PATH, 'utf8'));
  const byProject = new Map<number, number>();

  for (const log of logs) {
    const ts = log.timestamp.getTime();
    const current = byProject.get(log.project_id);
    if (current === undefined || ts > current) {
      byProject.set(log.project_id, ts);
    }
  }

  const projects = tokens.map((token) => {
    const lastUpdatedAt = byProject.get(token.project_id) ?? null;
    return {
      projectId: token.project_id,
      lastUpdatedAt,
      status: computeProjectStatus(lastUpdatedAt),
    };
  });

  if (cache === null) {
    return { cachedAt: null, stale: true, loadedAt: Date.now(), projects };
  }
  return {
    cachedAt: cache.savedAt,
    stale: isCacheStale(cache),
    loadedAt: Date.now(),
    projects,
  };
};
