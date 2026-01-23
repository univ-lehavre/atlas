/**
 * Integration tests for mock-redcap
 *
 * These tests verify that the mock server correctly implements
 * the REDCap API interface used by @univ-lehavre/atlas-redcap-api
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import {
  createRedcapClient,
  RedcapUrl,
  RedcapToken,
  RecordId,
  InstrumentName,
} from '@univ-lehavre/atlas-redcap-api';
import { Effect } from 'effect';

// Import the mock app (we'll need to export it from index.ts)
// For now, we'll start a test server

const MOCK_PORT = 8081;
const MOCK_URL = `http://localhost:${MOCK_PORT}/api/`;
const MOCK_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

let server: ReturnType<typeof serve> | null = null;

beforeAll(async () => {
  // Start mock server for tests
  const { default: mockApp } = await import('./test-server.js');
  server = serve({ fetch: mockApp.fetch, port: MOCK_PORT });
  // Give server time to start
  await new Promise((resolve) => setTimeout(resolve, 100));
});

afterAll(() => {
  if (server) {
    server.close();
  }
});

describe('mock-redcap integration with redcap-api', () => {
  const client = createRedcapClient({
    url: RedcapUrl(MOCK_URL),
    token: RedcapToken(MOCK_TOKEN),
  });

  it('should get REDCap version', async () => {
    const version = await Effect.runPromise(client.getVersion());
    expect(version).toBe('14.0.0');
  });

  it('should get project info with branded types', async () => {
    const info = await Effect.runPromise(client.getProjectInfo());
    expect(info.project_id).toBeGreaterThan(0);
    expect(info.project_title).toBeTruthy();
    expect(info.creation_time).toBeTruthy();
    expect([0, 1]).toContain(info.in_production);
    expect([0, 1]).toContain(info.record_autonumbering_enabled);
  });

  it('should get instruments', async () => {
    const instruments = await Effect.runPromise(client.getInstruments());
    expect(Array.isArray(instruments)).toBe(true);
    expect(instruments.length).toBeGreaterThan(0);
    expect(instruments[0]).toHaveProperty('instrument_name');
    expect(instruments[0]).toHaveProperty('instrument_label');
  });

  it('should get fields (metadata)', async () => {
    const fields = await Effect.runPromise(client.getFields());
    expect(Array.isArray(fields)).toBe(true);
    expect(fields.length).toBeGreaterThan(0);
    expect(fields[0]).toHaveProperty('field_name');
    expect(fields[0]).toHaveProperty('form_name');
    expect(fields[0]).toHaveProperty('field_type');
  });

  it('should get export field names', async () => {
    const fieldNames = await Effect.runPromise(client.getExportFieldNames());
    expect(Array.isArray(fieldNames)).toBe(true);
    expect(fieldNames.length).toBeGreaterThan(0);
    expect(fieldNames[0]).toHaveProperty('original_field_name');
    expect(fieldNames[0]).toHaveProperty('export_field_name');
  });

  it('should export all records', async () => {
    const records = await Effect.runPromise(client.exportRecords());
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
  });

  it('should export records with field filter', async () => {
    const records = await Effect.runPromise(
      client.exportRecords({ fields: ['record_id', 'email'] })
    );
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
    // Filtered records should only have specified fields
    const firstRecord = records[0] as Record<string, unknown>;
    expect(Object.keys(firstRecord).sort()).toEqual(['email', 'record_id'].sort());
  });

  it('should export records with filterLogic', async () => {
    const records = await Effect.runPromise(
      client.exportRecords({
        filterLogic: '[email] = "john.doe@example.com"',
      })
    );
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBe(1);
    const record = records[0] as { email: string };
    expect(record.email).toBe('john.doe@example.com');
  });

  it('should import records', async () => {
    const result = await Effect.runPromise(
      client.importRecords([{ record_id: 'def0123456789abcdef0', name: 'Test User' }])
    );
    expect(result.count).toBe(1);
  });

  it('should get survey link with branded types', async () => {
    const link = await Effect.runPromise(
      client.getSurveyLink(RecordId('abcdef0123456789abcd'), InstrumentName('demographics'))
    );
    expect(typeof link).toBe('string');
    expect(link).toContain('mock-redcap.local/surveys');
  });

  it('should download PDF with branded types', async () => {
    const pdf = await Effect.runPromise(
      client.downloadPdf(RecordId('abcdef0123456789abcd'), InstrumentName('demographics'))
    );
    expect(pdf instanceof ArrayBuffer).toBe(true);
    expect(pdf.byteLength).toBeGreaterThan(0);
  });

  it('should find user by email', async () => {
    const userId = await Effect.runPromise(client.findUserIdByEmail('john.doe@example.com'));
    expect(userId).toBe('abcdef0123456789abcd');
  });

  it('should return null when user not found', async () => {
    const userId = await Effect.runPromise(client.findUserIdByEmail('nonexistent@example.com'));
    expect(userId).toBeNull();
  });

  // Note: Mock server accepts all valid 32-hex-character tokens for simplicity
  // Real REDCap would validate against stored tokens
});
