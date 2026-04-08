import {
  enrichLogs,
  computeCalendar,
  readCache,
  type Granularity,
} from '@univ-lehavre/atlas-redcap-logs';
import { json } from '@sveltejs/kit';
import { applyPatches } from '$lib/patches.js';

const GRANULARITIES: Granularity[] = ['day', 'week', 'month', 'quarter'];

export const GET = async ({ url }: { url: URL }): Promise<Response> => {
  const raw = url.searchParams.get('granularity') ?? 'month';
  const granularity: Granularity = (GRANULARITIES as string[]).includes(raw)
    ? (raw as Granularity)
    : 'month';

  const cache = await readCache();
  if (cache === null) {
    return json({ error: 'no_data' }, { status: 404 });
  }

  const enriched = applyPatches(enrichLogs(cache.logs));
  const points = computeCalendar(granularity, enriched);

  return json({ points, cachedAt: cache.savedAt });
};
