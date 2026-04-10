import { json } from '@sveltejs/kit';
import { readCache } from '$lib/cache.js';
import { computeStats } from '$lib/compute.js';
import type { Period } from '$lib/types.js';

const PERIODS: Period[] = ['day', 'week', 'month', 'quarter'];

export const GET = async ({ url }: { url: URL }): Promise<Response> => {
  const raw = url.searchParams.get('period') ?? 'week';
  const period: Period = (PERIODS as string[]).includes(raw) ? (raw as Period) : 'week';

  const cache = await readCache();
  if (cache === null) return json({ error: 'no_data' }, { status: 404 });

  return json(computeStats(cache, period));
};
