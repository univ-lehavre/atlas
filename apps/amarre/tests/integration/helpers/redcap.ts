// Helpers shared by the level-3 integration suite under tests/integration/.
//
// These tests exercise amarre's server services (`$lib/server/services/*`)
// against a real REDCap docker on localhost:8888. They self-skip when the
// stack isn't up so they're safe to leave in `pnpm test`.

import { PUBLIC_REDCAP_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';

// Helper de test : lecture TOLÉRANTE du token (forme objet `env` de
// dynamic/private), pas le getter fail-closed `$lib/server/env` — la suite doit
// pouvoir DÉTECTER un token absent/placeholder pour se skip, pas throw.
const REDCAP_API_TOKEN = env.REDCAP_API_TOKEN;

/**
 * Probes the REDCap API on the configured URL with the configured token.
 * Returns true when the project responds — i.e. both the docker container
 * and the bootstrap step have run. Catches all error paths (DNS, ECONN-
 * REFUSED, 401, 5xx) so callers can use it for a skip predicate.
 */
export const isRedcapReachable = async (): Promise<boolean> => {
  if (!REDCAP_API_TOKEN || REDCAP_API_TOKEN.startsWith('<')) {
    // Placeholder value from .env.example — bootstrap-crf hasn't run.
    return false;
  }
  try {
    const response = await fetch(PUBLIC_REDCAP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        token: REDCAP_API_TOKEN,
        content: 'version',
        format: 'json',
      }).toString(),
      // Bound the connect attempt so the test boot doesn't hang when the
      // docker is down — vitest's hookTimeout would catch it eventually
      // but a fast skip is better DX.
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Default test context : amarre's services accept a SvelteKit-style
 * `{ fetch }` object. In Node we feed them the global fetch.
 */
export const nodeContext = { fetch: globalThis.fetch.bind(globalThis) };

/**
 * Delete all records whose `userid` starts with the given prefix. Used
 * for before-all cleanup so the suite can re-run without polluting
 * REDCap with leftover rows.
 *
 * Filtre sur `userid`, pas sur `record_id` : `newRequest()` génère le
 * record_id via `ID.unique()` (hex random ne matchant jamais le prefix).
 * Le seul champ tagué par le test est `userid = ${TEST_PREFIX}${suffix}`.
 * Sans ce fix, les records de chaque run s'accumulent jusqu'au plafond
 * REDCap dev (50 records).
 *
 * Goes through the REDCap API directly (the amarre services don't expose
 * a delete operation — that's a server-side admin concern).
 */
export const deleteRecordsByPrefix = async (prefix: string): Promise<void> => {
  // Appelé seulement quand `isRedcapReachable()` a déjà validé le token ; la
  // garde locale le rend explicite pour TypeScript (token: string garanti).
  if (!REDCAP_API_TOKEN) return;
  // Export record_id + userid pour tous les records.
  const exportRes = await fetch(PUBLIC_REDCAP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      token: REDCAP_API_TOKEN,
      content: 'record',
      action: 'export',
      format: 'json',
      type: 'flat',
      fields: 'record_id,userid',
    }).toString(),
  });
  if (!exportRes.ok) return;
  const rows = (await exportRes.json()) as { record_id: string; userid?: string }[];
  const ids = rows
    .filter((r) => typeof r.userid === 'string' && r.userid.startsWith(prefix))
    .map((r) => r.record_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (ids.length === 0) return;
  const deleteBody = new URLSearchParams({
    token: REDCAP_API_TOKEN,
    content: 'record',
    action: 'delete',
  });
  for (const [i, id] of ids.entries()) deleteBody.append(`records[${i}]`, id);
  await fetch(PUBLIC_REDCAP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: deleteBody.toString(),
  });
};
