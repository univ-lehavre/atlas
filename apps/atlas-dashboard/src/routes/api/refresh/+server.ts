import { env } from '$env/dynamic/private';
import { readCache, writeCache, isCacheStale } from '$lib/cache.js';
import { fetchReleases } from '$lib/github.js';
import { fetchNpmPackages, fetchAllDownloads } from '$lib/npm.js';
import { defaultRefreshCoordinator } from '$lib/refresh-coordinator.js';
import type { SseEvent } from '$lib/types.js';

const encoder = new TextEncoder();

// Déduplication et bridage des actualisations concurrentes sont délégués au
// coordinateur (mono-instance par défaut ; injectable pour un backing-service
// partagé en multi-instance — voir $lib/refresh-coordinator.ts et l'ADR 0040).
const coordinator = defaultRefreshCoordinator;

type Sender = (event: SseEvent) => void;

const fetchAndCache = async (send: Sender): Promise<number> => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 89);

  send({ type: 'start', steps: 0 });

  const releases = await fetchReleases(env.GITHUB_TOKEN ?? '');
  send({ type: 'progress', step: 1, steps: 0, label: 'Releases GitHub récupérées' });

  const packages = await fetchNpmPackages();
  send({
    type: 'progress',
    step: 2,
    steps: 0,
    label: `${String(packages.length)} paquets npm trouvés`,
  });

  const downloads = await fetchAllDownloads(packages, start, end, (done, total) => {
    send({
      type: 'progress',
      step: 2 + done,
      steps: 2 + total,
      label: `Téléchargements ${String(done)}/${String(total)}`,
    });
  });

  const savedAt = Date.now();
  await writeCache({ savedAt, releases, packages, downloads });
  return savedAt;
};

export const GET = ({ url }: { url: URL }): Response => {
  const forceRefresh = env.NODE_ENV !== 'production' && url.searchParams.get('force') === '1';

  const stream = new ReadableStream({
    start(controller) {
      const send: Sender = (event) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const run = async (): Promise<void> => {
        const cache = await readCache();
        if (!forceRefresh && cache !== null && !isCacheStale(cache)) {
          send({ type: 'cached', cachedAt: cache.savedAt });
          controller.close();
          return;
        }

        const inFlight = coordinator.getInFlight();
        if (inFlight !== null) {
          const cachedAt = await inFlight;
          send({ type: 'cached', cachedAt });
          controller.close();
          return;
        }

        const now = Date.now();
        if (!forceRefresh && now - coordinator.getLastRefreshAt() < coordinator.minIntervalMs) {
          send({
            type: 'error',
            message: 'Actualisation récente détectée, réessaie dans moins d’une minute.',
          });
          controller.close();
          return;
        }

        const refresh = fetchAndCache(send);
        coordinator.setInFlight(refresh);
        const savedAt = await refresh;
        coordinator.setLastRefreshAt(savedAt);
        send({ type: 'done', cachedAt: savedAt });
        controller.close();
      };

      void run()
        .catch((error: unknown) => {
          send({ type: 'error', message: error instanceof Error ? error.message : String(error) });
          controller.close();
        })
        .finally(() => {
          coordinator.setInFlight(null);
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
