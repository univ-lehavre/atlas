/**
 * REDCap admin helpers — 100 % API/web-endpoint based, no SQL.
 *
 * Why this exists
 * ---------------
 * Provisioning a new REDCap project (e.g. to host the amarre data
 * dictionary for contract tests) is not possible with a per-project
 * API token: it requires a *super-API token* that only super-users
 * can mint via the Control Center → API Tokens page.
 *
 * The crf-sandbox runs REDCap with `auth_meth_global=none`, so the
 * first visitor is implicitly authenticated as `site_admin` (a
 * super-user). That makes it possible to:
 *
 *   1. Hit `/redcap_v16.1.9/ControlCenter/user_api_ajax.php?action=createToken_s`
 *      to mint a super-API token for `site_admin`.
 *   2. Read its value via `?action=viewToken_s`.
 *   3. Use it against `POST /api/?content=project&action=import` to
 *      create a brand-new project with its own token (returned as
 *      the raw response body).
 *
 * Everything below is a thin typed wrapper around those endpoints.
 * No SQL is executed.
 */

import { readFileSync } from 'node:fs';

export interface ProjectImportSettings {
  /** Display name shown in the REDCap dashboard. */
  project_title: string;
  /**
   * REDCap "purpose" code, encoded as a string :
   *   '0' Practice / Just for fun
   *   '1' Other
   *   '2' Research
   *   '3' Quality Improvement
   *   '4' Operational Support
   */
  purpose: '0' | '1' | '2' | '3' | '4';
  /** Optional `purpose_other` free text (only when purpose === '1'). */
  purpose_other?: string;
  /** REDCap UI locale, e.g. `Francais_11.3.1` or `English`. */
  project_language?: string;
  /** Free-text notes shown on the project home page. */
  project_notes?: string;
}

export interface DataDictionaryField {
  field_name: string;
  form_name: string;
  field_type: string;
  field_label: string;
  [k: string]: unknown;
}

/**
 * Default REDCap version path prefix shipped by the crf-sandbox.
 * Centralised here so a future REDCap upgrade only changes one constant.
 */
const REDCAP_VERSION_PATH = '/redcap_v16.1.9';

/**
 * Endpoint for super-token AJAX actions. Same URL as the dashboard JS
 * uses; we hit it with `fetch` instead of a browser.
 */
const SUPER_TOKEN_ENDPOINT = `${REDCAP_VERSION_PATH}/ControlCenter/user_api_ajax.php`;

/**
 * Field name pattern accepted by REDCap. Anything else is silently
 * accepted on metadata/import but later rejected on record/import.
 */
const VALID_FIELD_NAME = /^[a-z][a-z0-9_]*$/;

/**
 * Establish a REDCap session (auth=none) and capture the cookie so
 * subsequent ajax calls are recognised as `site_admin`.
 */
async function openSession(baseUrl: string): Promise<string> {
  const r = await fetch(baseUrl, { redirect: 'manual' });
  const cookies = r.headers.getSetCookie?.() ?? [];
  const session = cookies.find((c) => c.startsWith('redcap_session_'));
  if (!session) {
    throw new Error(
      `No REDCap session cookie returned by ${baseUrl} — check auth_meth_global=none is in effect.`
    );
  }
  return session.split(';')[0]!;
}

/**
 * Mint (or rotate) a super-API token for `site_admin`. Idempotent:
 * if a super-token already exists, `createToken_s` is a no-op and we
 * just read the existing value via `viewToken_s`.
 *
 * Returns the 64-character token.
 */
export async function mintSuperToken(baseUrl: string, username = 'site_admin'): Promise<string> {
  const cookie = await openSession(baseUrl);
  const headers = { Cookie: cookie } as const;

  // Idempotent create. The endpoint replies with an HTML snippet that
  // we don't need to parse — only the side effect matters.
  await fetch(
    `${baseUrl}${SUPER_TOKEN_ENDPOINT}?action=createToken_s&api_username=${encodeURIComponent(username)}`,
    { headers }
  );

  // Read it back. Body looks like:
  //   <div ...>Super API Token: <div ...>HEX64</div></div>
  const viewRes = await fetch(
    `${baseUrl}${SUPER_TOKEN_ENDPOINT}?action=viewToken_s&api_username=${encodeURIComponent(username)}`,
    { headers }
  );
  if (!viewRes.ok) {
    throw new Error(`viewToken_s failed: HTTP ${viewRes.status}`);
  }
  const html = await viewRes.text();
  const match = html.match(/>([A-Fa-f0-9]{64})</);
  if (!match) {
    throw new Error(
      `Could not extract super-API token from response.\nBody (truncated): ${html.slice(0, 300)}`
    );
  }
  return match[1]!;
}

/**
 * Create a new REDCap project via the super-API token. Returns the
 * per-project API token (32 hex chars).
 */
export async function createProject(
  apiUrl: string,
  superToken: string,
  settings: ProjectImportSettings
): Promise<string> {
  const body = new URLSearchParams({
    token: superToken,
    content: 'project',
    format: 'json',
    data: JSON.stringify([settings]),
  });

  const r = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`POST /api/?content=project&action=import failed (HTTP ${r.status}): ${text}`);
  }
  // REDCap returns the new project token as a raw 32-char hex string.
  const cleaned = text.trim();
  if (!/^[A-Fa-f0-9]{32}$/.test(cleaned)) {
    throw new Error(`Unexpected response from createProject: ${text.slice(0, 200)}`);
  }
  return cleaned;
}

/**
 * Confirm a project-scoped token actually points at a project with
 * the expected title. Used for idempotency in setup scripts: when a
 * cached token is reused across runs, we double-check it didn't get
 * invalidated or reassigned by a `pnpm docker:reset` since last time.
 */
export async function tokenMatchesProject(
  apiUrl: string,
  token: string,
  expectedTitle: string
): Promise<boolean> {
  const body = new URLSearchParams({ token, content: 'project', format: 'json' });
  const r = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!r.ok) return false;
  const json = (await r.json()) as { project_title?: string };
  return json.project_title === expectedTitle;
}

/**
 * Import a data dictionary into a freshly-created REDCap project.
 *
 * The exported `127-amarre-v1.json` carries a few PII-redacted field
 * names like `alignement_[REDACTED]` that REDCap accepts on
 * `metadata/import` but later rejects on `record/import`. Filter them
 * out here so the resulting project is fully usable.
 */
export async function importDataDictionary(
  apiUrl: string,
  projectToken: string,
  dictPath: string
): Promise<{ imported: number; dropped: number }> {
  const raw = readFileSync(dictPath, 'utf8');
  const all = (JSON.parse(raw) as { fields?: DataDictionaryField[] }).fields ?? [];
  const fields = all.filter((f) => VALID_FIELD_NAME.test(f.field_name));
  const dropped = all.length - fields.length;

  const body = new URLSearchParams({
    token: projectToken,
    content: 'metadata',
    action: 'import',
    format: 'json',
    data: JSON.stringify(fields),
    returnFormat: 'json',
  });

  const r = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`metadata/import failed (HTTP ${r.status}): ${text.slice(0, 400)}`);
  }
  const imported = Number(text.trim());
  if (!Number.isFinite(imported)) {
    throw new Error(`metadata/import returned non-numeric body: ${text.slice(0, 200)}`);
  }
  return { imported, dropped };
}
