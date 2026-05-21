/**
 * REDCap contract tests — amarre records lifecycle.
 *
 * The amarre app creates / lists / deletes records using a stable
 * "one user owns many records" pattern. The key endpoints are :
 *
 *   - POST record/import       (cf. lib/server/services/surveys.ts newRequest)
 *   - GET  record export       with `filterLogic=[userid] = "..."`
 *   - POST record/delete
 *
 * The filterLogic clause needs escaping for user-supplied userid values
 * (cf. `escapeFilterLogicValue` in surveys.ts). We exercise both paths
 * here against a clean amarre project.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface AmarreFixture {
  title: string;
  token: string;
  recordCount: number;
}

interface FixturesConfig {
  apiUrl: string;
  amarre: AmarreFixture;
}

const FIXTURES_PATH = join(import.meta.dirname, '../fixtures/projects.json');

let amarre: AmarreFixture;
let apiUrl: string;

async function postApi(
  params: Record<string, string>
): Promise<{ status: number; data: unknown; text: string }> {
  const body = new URLSearchParams(params);
  const r = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await r.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: r.status, data, text };
}

async function importRecords(records: Array<Record<string, string>>): Promise<number> {
  const { status, data } = await postApi({
    token: amarre.token,
    content: 'record',
    action: 'import',
    format: 'json',
    type: 'flat',
    data: JSON.stringify(records),
    overwriteBehavior: 'overwrite',
    forceAutoNumber: 'false',
    returnContent: 'count',
  });
  if (status !== 200) {
    throw new Error(`record import failed (${status}): ${JSON.stringify(data)}`);
  }
  const body = data as { count?: number };
  return body.count ?? 0;
}

async function deleteRecord(recordId: string): Promise<void> {
  await postApi({
    token: amarre.token,
    content: 'record',
    action: 'delete',
    'records[0]': recordId,
  });
}

async function listAllRecords(): Promise<Array<Record<string, string>>> {
  const { data } = await postApi({
    token: amarre.token,
    content: 'record',
    format: 'json',
    type: 'flat',
    fields: 'record_id',
  });
  return data as Array<Record<string, string>>;
}

describe('Amarre — records lifecycle contract', () => {
  beforeAll(() => {
    if (!existsSync(FIXTURES_PATH)) {
      throw new Error('Fixtures not found. Run: pnpm test:setup');
    }
    const fixtures = JSON.parse(readFileSync(FIXTURES_PATH, 'utf-8')) as FixturesConfig;
    apiUrl = fixtures.apiUrl;
    amarre = fixtures.amarre;
    if (!amarre?.token) {
      throw new Error('Amarre fixture missing — re-run pnpm test:setup');
    }
  });

  // Clean up any test records before/after so the suite is hermetic.
  beforeEach(async () => {
    const existing = await listAllRecords();
    for (const r of existing) {
      if (r['record_id']?.startsWith('amarre-test-')) {
        await deleteRecord(r['record_id']!);
      }
    }
  });

  afterAll(async () => {
    const existing = await listAllRecords();
    for (const r of existing) {
      if (r['record_id']?.startsWith('amarre-test-')) {
        await deleteRecord(r['record_id']!);
      }
    }
  });

  it('imports a single amarre record (shape used by surveys.ts newRequest)', async () => {
    const count = await importRecords([
      {
        record_id: 'amarre-test-001',
        created_at: new Date().toISOString(),
        userid: 'amarre-test-user-001',
        email: 'tester001@amarre.local',
        contact_complete: '1',
      },
    ]);
    expect(count).toBe(1);
  });

  it('exports records filtered by [userid] (cf. listSurveys server-side)', async () => {
    await importRecords([
      {
        record_id: 'amarre-test-010',
        userid: 'amarre-test-user-alpha',
        email: 'alpha@amarre.local',
        contact_complete: '1',
      },
      {
        record_id: 'amarre-test-011',
        userid: 'amarre-test-user-beta',
        email: 'beta@amarre.local',
        contact_complete: '1',
      },
    ]);

    const { status, data } = await postApi({
      token: amarre.token,
      content: 'record',
      format: 'json',
      type: 'flat',
      filterLogic: '[userid] = "amarre-test-user-alpha"',
      fields: 'record_id,userid,email',
    });
    expect(status).toBe(200);
    const rows = data as Array<Record<string, string>>;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.['record_id']).toBe('amarre-test-010');
    expect(rows[0]?.['email']).toBe('alpha@amarre.local');
  });

  it('returns an empty array when filterLogic matches nothing', async () => {
    const { status, data } = await postApi({
      token: amarre.token,
      content: 'record',
      format: 'json',
      type: 'flat',
      filterLogic: '[userid] = "amarre-test-no-such-user"',
      fields: 'record_id',
    });
    expect(status).toBe(200);
    expect(data).toEqual([]);
  });

  it('deletes a record and confirms it disappears from subsequent exports', async () => {
    await importRecords([
      {
        record_id: 'amarre-test-030',
        userid: 'amarre-test-user-delete',
        email: 'todelete@amarre.local',
        contact_complete: '1',
      },
    ]);

    await deleteRecord('amarre-test-030');

    const { data } = await postApi({
      token: amarre.token,
      content: 'record',
      format: 'json',
      type: 'flat',
      filterLogic: '[userid] = "amarre-test-user-delete"',
      fields: 'record_id',
    });
    expect(data).toEqual([]);
  });
});
