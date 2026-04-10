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
  diagnoseEndpointNetwork,
} from '@univ-lehavre/atlas-redcap-logs';
import type { RawLog, ProjectToken } from '@univ-lehavre/atlas-redcap-logs';

type CacheFile = Awaited<ReturnType<typeof readCache>>;
type RefreshStage =
  | 'read_cache'
  | 'read_tokens'
  | 'validate_config'
  | 'fetch_logs'
  | 'persist_cache';

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
  forceRefresh: boolean,
  send: Sender
): Promise<void> => {
  const enriched = enrichLogs(allLogs);
  const hasNewData = enriched.length > (cache?.logs.length ?? 0);
  const shouldWriteCache =
    forceRefresh || cache === null || hasNewData || (cache !== null && isCacheStale(cache));
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

const normalizeError = (err: unknown): { message: string; details?: string } => {
  if (err instanceof Error) {
    const details = err.stack ?? err.message;
    return { message: err.message, details };
  }
  return { message: String(err) };
};

const stageMessage: Record<RefreshStage, string> = {
  read_cache: 'Impossible de lire le cache local.',
  read_tokens: 'Impossible de lire ou parser redcap-token.csv.',
  validate_config: 'Configuration REDCAP_API_URL manquante ou invalide.',
  fetch_logs: 'Erreur lors de la récupération des logs REDCap.',
  persist_cache: 'Erreur lors de la persistance du cache local.',
};

export const GET = ({ url }: { url: URL }): Response => {
  const forceRefresh = url.searchParams.get('force') === '1';
  const stream = new ReadableStream({
    start(controller) {
      let currentStage: RefreshStage = 'read_cache';
      const send: Sender = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const run = async () => {
        currentStage = 'read_cache';
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
        currentStage = 'read_tokens';
        const tokens = parseTokensCsv(readFileSync(TOKENS_PATH, 'utf8'));
        currentStage = 'validate_config';
        const apiUrl = env.REDCAP_API_URL ?? '';
        if (apiUrl.trim().length === 0) {
          throw new Error('REDCAP_API_URL est vide.');
        }
        const ctx: FetchCtx = { apiUrl, total: tokens.length, send };
        send({ type: 'start', total: ctx.total });
        currentStage = 'fetch_logs';
        const { logs } = await runBatches(chunk(tokens, BATCH_SIZE), ctx, { logs: [], done: 0 });
        currentStage = 'persist_cache';
        await persistAndSend(logs, cache, forceRefresh, send);
        controller.close();
      };

      void run().catch(async (err: unknown) => {
        const now = new Date();
        const errorId = `rdc-${now.toISOString()}-${Math.floor(Math.random() * 10_000)
          .toString()
          .padStart(4, '0')}`;
        const { message, details } = normalizeError(err);
        const diagnostics =
          currentStage === 'fetch_logs'
            ? await diagnoseEndpointNetwork(env.REDCAP_API_URL ?? '')
            : undefined;

        console.error('[redcap-dashboard] refresh error', {
          errorId,
          stage: currentStage,
          message,
          details,
          diagnostics,
          forceRefresh,
          at: now.toISOString(),
        });

        send({
          type: 'error',
          code: 'REFRESH_FAILED',
          errorId,
          stage: currentStage,
          message: `${stageMessage[currentStage]} (${message})`,
          details,
          diagnostics,
        });
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
