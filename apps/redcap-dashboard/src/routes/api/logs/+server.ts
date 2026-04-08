import { env } from '$env/dynamic/private';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import {
  fetchProjectLogs,
  enrichLogs,
  parseTokensCsv,
  computeMonthlyCalendar,
  readCache,
  writeCache,
  isCacheStale,
} from '@univ-lehavre/atlas-redcap-logs';
import type { RawLog, ProjectToken } from '@univ-lehavre/atlas-redcap-logs';

type CacheFile = Awaited<ReturnType<typeof readCache>>;

const TOKENS_PATH = path.resolve(import.meta.dirname, '../../../../../../redcap-token.csv');
const BATCH_SIZE = 3;

const chunk = <T>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );

type Sender = (data: object) => void;
type BatchState = { logs: RawLog[]; done: number };
type FetchCtx = { apiUrl: string; total: number; send: Sender };

const fetchBatch = async (
  batch: ProjectToken[],
  ctx: FetchCtx,
  state: BatchState
): Promise<BatchState> => {
  const results = await Promise.all(batch.map((token) => fetchProjectLogs(ctx.apiUrl, token)));
  const newDone = state.done + batch.length;
  ctx.send({ type: 'progress', done: newDone, total: ctx.total });
  return { logs: [...state.logs, ...results.flat()], done: newDone };
};

const runBatches = (
  batches: ProjectToken[][],
  ctx: FetchCtx,
  state: BatchState
): Promise<BatchState> =>
  batches.length === 0
    ? Promise.resolve(state)
    : fetchBatch(batches[0]!, ctx, state).then((next) => runBatches(batches.slice(1), ctx, next));

const persistAndSend = async (
  allLogs: RawLog[],
  cache: CacheFile | null,
  send: Sender
): Promise<void> => {
  const enriched = enrichLogs(allLogs);
  const hasNewData = enriched.length > (cache?.logs.length ?? 0);
  const shouldWriteCache = cache === null || hasNewData || (cache !== null && isCacheStale(cache));
  const persistedAt = shouldWriteCache ? Date.now() : (cache?.savedAt ?? null);
  if (shouldWriteCache) {
    await writeCache(
      enriched.map((e) => ({
        project_id: e.project_id,
        timestamp: e.timestamp.toISOString(),
        username: e.username,
        action: e.action,
      }))
    );
  }
  send({
    type: 'done',
    total: enriched.length,
    hasNewData,
    cachedAt: persistedAt,
    monthly: computeMonthlyCalendar(enriched),
  });
};

const encoder = new TextEncoder();

export const GET = ({ url }: { url: URL }): Response => {
  const forceRefresh = url.searchParams.get('force') === '1';
  const stream = new ReadableStream({
    start(controller) {
      const send: Sender = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const run = async () => {
        const cache = await readCache();
        if (!forceRefresh && cache !== null && !isCacheStale(cache)) {
          send({
            type: 'cached',
            cachedAt: cache.savedAt,
            total: enrichLogs(cache.logs).length,
          });
          controller.close();
          return;
        }
        const tokens = parseTokensCsv(readFileSync(TOKENS_PATH, 'utf8'));
        const ctx: FetchCtx = { apiUrl: env.REDCAP_API_URL ?? '', total: tokens.length, send };
        send({ type: 'start', total: ctx.total });
        const { logs } = await runBatches(chunk(tokens, BATCH_SIZE), ctx, { logs: [], done: 0 });
        await persistAndSend(logs, cache, send);
        controller.close();
      };

      void run().catch((err: unknown) => {
        send({ type: 'error', message: err instanceof Error ? err.message : String(err) });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
};
