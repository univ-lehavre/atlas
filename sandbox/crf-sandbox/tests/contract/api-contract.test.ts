/**
 * REDCap API Contract Tests
 *
 * Validates API responses against expected schemas and data.
 * These tests use fixtures created by setup-test-projects.ts
 *
 * Run: pnpm test:contract
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface ProjectFixture {
  id: number;
  name: string;
  token: string;
  recordCount: number;
  capabilities?: {
    reportId?: string;
    surveyInstrument?: string;
    surveyEvent?: string;
    fileUploadField?: string;
  };
  expected: {
    metadata: number;
    instruments: number;
    hasEvents: boolean;
    hasRepeatingForms: boolean;
    hasSurveys: boolean;
  };
}

interface FixturesConfig {
  apiUrl: string;
  generatedAt: string;
  projects: ProjectFixture[];
}

const FIXTURES_PATH = join(import.meta.dirname, '../fixtures/projects.json');

let fixtures: FixturesConfig;
let apiUrl: string;

function defaultProject(): ProjectFixture {
  const p = fixtures.projects[0];
  if (!p) throw new Error('No project fixture found');
  return p;
}

function longitudinalProject(): ProjectFixture | undefined {
  return fixtures.projects.find((p) => p.expected.hasEvents);
}

function classicProject(): ProjectFixture | undefined {
  return fixtures.projects.find((p) => !p.expected.hasEvents);
}

function repeatingProject(): ProjectFixture | undefined {
  return fixtures.projects.find((p) => p.expected.hasRepeatingForms);
}

function surveyProject(): ProjectFixture {
  return fixtures.projects.find((p) => p.capabilities?.surveyInstrument) ?? defaultProject();
}

async function apiRequest(
  token: string,
  content: string,
  additionalParams: Record<string, string> = {}
): Promise<{ status: number; data: unknown; text: string }> {
  const params = new URLSearchParams({
    token,
    content,
    format: 'json',
    ...additionalParams,
  });

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const text = await response.text();
  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: response.status, data, text };
}

async function apiRequestMultipart(
  token: string,
  fields: Record<string, string>,
  fileField: string,
  fileName: string,
  fileContent: Blob
): Promise<{ status: number; data: unknown; text: string }> {
  const form = new FormData();
  form.append('token', token);
  for (const [k, v] of Object.entries(fields)) {
    form.append(k, v);
  }
  form.append(fileField, fileContent, fileName);

  const response = await fetch(apiUrl, { method: 'POST', body: form });
  const text = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, data, text };
}

/** True si la réponse indique une erreur métier REDCap attendue (pas un crash). */
function isKnownApiError(text: string): boolean {
  return /error|not enabled|not valid|You cannot|not supported|does not exist|No records|missing|required|must provide|No file/i.test(
    text
  );
}

function getRecordId(record: Record<string, unknown>): string {
  return String(record['study_id'] ?? record['record_id'] ?? record['participant_id'] ?? '1');
}

function expectObjectRows(data: unknown): Array<Record<string, unknown>> {
  expect(Array.isArray(data)).toBe(true);
  const rows = data as Array<Record<string, unknown>>;
  for (const row of rows) {
    expect(row).toBeTypeOf('object');
    expect(row).not.toBeNull();
  }
  return rows;
}

function expectStringField(row: Record<string, unknown>, field: string): void {
  expect(row).toHaveProperty(field);
  expect(typeof row[field]).toBe('string');
}

function expectIsoLikeLogTimestamp(value: unknown): void {
  expect(typeof value).toBe('string');
  expect(value).toMatch(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/);
}

describe('REDCap API Contract Tests', () => {
  beforeAll(() => {
    if (!existsSync(FIXTURES_PATH)) {
      throw new Error('Fixtures not found. Run: pnpm test:setup');
    }

    fixtures = JSON.parse(readFileSync(FIXTURES_PATH, 'utf-8'));
    apiUrl = fixtures.apiUrl;
  });

  // ---------------------------------------------------------------------------
  // Version
  // ---------------------------------------------------------------------------

  describe('Version endpoint', () => {
    it('should return version string', async () => {
      const project = defaultProject();
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: project.token, content: 'version' }).toString(),
      });

      const text = await response.text();
      expect(response.status).toBe(200);
      expect(text).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  // ---------------------------------------------------------------------------
  // Project
  // ---------------------------------------------------------------------------

  describe('Project endpoint', () => {
    it('should return project info object', async () => {
      const project = defaultProject();
      const { status, data } = await apiRequest(project.token, 'project');

      expect(status).toBe(200);
      expect(data).toBeTypeOf('object');
      expect(data).toHaveProperty('project_id');
      expect(data).toHaveProperty('project_title');
      expect(data).toHaveProperty('in_production');
      expect(data).toHaveProperty('record_autonumbering_enabled');
    });

    it('should return correct project_id for each project', async () => {
      for (const project of fixtures.projects) {
        const { data } = await apiRequest(project.token, 'project');
        expect((data as { project_id: number }).project_id).toBe(project.id);
      }
    });

    it('should accept project settings import', async () => {
      const project = defaultProject();
      const settings = JSON.stringify({ project_title: project.name });
      const { status, text } = await apiRequest(project.token, 'project_settings', {
        action: 'import',
        data: settings,
      });
      // 200 = applied, 4xx = validation error — both are valid API responses
      expect([200, 400, 403]).toContain(status);
      if (status !== 200) {
        expect(isKnownApiError(text)).toBe(true);
      }
    });

    it('should export project settings or return REDCap empty response', async () => {
      const project = defaultProject();
      const { status, data, text } = await apiRequest(project.token, 'project_settings', {
        action: 'export',
      });

      expect(status).toBe(200);
      if (text === '') {
        expect(data).toBe('');
        return;
      }

      expect(data).toBeTypeOf('object');
      expect(data).toHaveProperty('project_title');
      expect(data).toHaveProperty('record_autonumbering_enabled');
    });
  });

  // ---------------------------------------------------------------------------
  // Metadata
  // ---------------------------------------------------------------------------

  describe('Metadata endpoint', () => {
    it('should return array of field definitions', async () => {
      const project = defaultProject();
      const { status, data } = await apiRequest(project.token, 'metadata');

      expect(status).toBe(200);
      const fields = expectObjectRows(data);
      expect(fields.length).toBeGreaterThan(0);
    });

    it('should have correct field structure', async () => {
      const project = defaultProject();
      const { data } = await apiRequest(project.token, 'metadata');

      const fields = data as Array<Record<string, unknown>>;
      const firstField = fields[0];

      expect(firstField).toHaveProperty('field_name');
      expect(firstField).toHaveProperty('form_name');
      expect(firstField).toHaveProperty('field_type');
      expect(firstField).toHaveProperty('field_label');
    });

    it('should have record_id or study_id as first field', async () => {
      for (const project of fixtures.projects) {
        const { data } = await apiRequest(project.token, 'metadata');
        const fields = data as Array<{ field_name: string }>;

        const firstFieldName = fields[0]?.field_name;
        expect(['record_id', 'study_id', 'participant_id']).toContain(firstFieldName);
      }
    });

    it('should import metadata and preserve field count', async () => {
      const project = defaultProject();
      const { data: existing } = await apiRequest(project.token, 'metadata');
      const fields = existing as Array<Record<string, unknown>>;
      const countBefore = fields.length;

      const { status, text } = await apiRequest(project.token, 'metadata', {
        action: 'import',
        data: JSON.stringify(fields),
      });

      expect([200, 400, 403]).toContain(status);
      if (status === 200) {
        const { data: after } = await apiRequest(project.token, 'metadata');
        expect((after as unknown[]).length).toBe(countBefore);
      } else {
        expect(isKnownApiError(text)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Instruments
  // ---------------------------------------------------------------------------

  describe('Instrument endpoint', () => {
    it('should return array of instruments', async () => {
      const project = defaultProject();
      const { status, data } = await apiRequest(project.token, 'instrument');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should have correct instrument structure', async () => {
      const project = defaultProject();
      const { data } = await apiRequest(project.token, 'instrument');

      const instruments = data as Array<Record<string, unknown>>;
      expect(instruments[0]).toHaveProperty('instrument_name');
      expect(instruments[0]).toHaveProperty('instrument_label');
    });

    it('should return expected instrument count', async () => {
      for (const project of fixtures.projects) {
        const { data } = await apiRequest(project.token, 'instrument');
        const instruments = data as unknown[];

        expect(instruments.length).toBeGreaterThanOrEqual(project.expected.instruments - 1);
        expect(instruments.length).toBeLessThanOrEqual(project.expected.instruments + 1);
      }
    });

    it('should export PDF blank form', async () => {
      const project = defaultProject();
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: project.token,
          content: 'pdf',
          action: 'export',
        }).toString(),
      });

      // PDF binary (200) or known error
      expect([200, 400, 403]).toContain(response.status);
      if (response.status === 200) {
        const buffer = await response.arrayBuffer();
        expect(buffer.byteLength).toBeGreaterThan(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Records
  // ---------------------------------------------------------------------------

  describe('Record endpoint', () => {
    it('should return array of records', async () => {
      const project = defaultProject();
      const { status, data } = await apiRequest(project.token, 'record');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return at least the imported records', async () => {
      for (const project of fixtures.projects) {
        const { data } = await apiRequest(project.token, 'record');
        const records = data as unknown[];

        expect(records.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should support filtering by fields', async () => {
      const project = defaultProject();
      const { data: allData } = await apiRequest(project.token, 'record');
      const { data: filteredData } = await apiRequest(project.token, 'record', {
        fields: 'study_id,first_name',
      });

      const allRecords = allData as Array<Record<string, unknown>>;
      const filteredRecords = filteredData as Array<Record<string, unknown>>;

      if (filteredRecords.length > 0) {
        const allFieldCount = Object.keys(allRecords[0] || {}).length;
        const filteredFieldCount = Object.keys(filteredRecords[0] || {}).length;
        expect(filteredFieldCount).toBeLessThanOrEqual(allFieldCount);
      }
    });

    it('should support rawOrLabel parameter', async () => {
      const project = defaultProject();
      const { data: rawData } = await apiRequest(project.token, 'record', { rawOrLabel: 'raw' });
      const { data: labelData } = await apiRequest(project.token, 'record', {
        rawOrLabel: 'label',
      });

      expect(Array.isArray(rawData)).toBe(true);
      expect(Array.isArray(labelData)).toBe(true);
    });

    it('should support EAV type export', async () => {
      const project = defaultProject();
      const { status, data } = await apiRequest(project.token, 'record', { type: 'eav' });

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      if ((data as unknown[]).length > 0) {
        const first = (data as Array<Record<string, unknown>>)[0];
        expect(first).toHaveProperty('record');
        expect(first).toHaveProperty('field_name');
        expect(first).toHaveProperty('value');
      }
    });

    it('should import a new record and then delete it', async () => {
      const project = defaultProject();
      const testRecordId = 'contract_test_delete_me';

      // Import
      const { status: importStatus, data: importData } = await apiRequest(project.token, 'record', {
        action: 'import',
        data: JSON.stringify([
          { study_id: testRecordId, first_name: 'Contract', last_name: 'Test' },
        ]),
        type: 'flat',
        overwriteBehavior: 'overwrite',
        returnContent: 'count',
      });

      expect(importStatus).toBe(200);
      expect((importData as { count: number }).count).toBeGreaterThanOrEqual(1);

      // Delete
      const { status: deleteStatus, data: deleteData } = await apiRequest(project.token, 'record', {
        action: 'delete',
        'records[0]': testRecordId,
      });

      expect(deleteStatus).toBe(200);
      expect(Number(deleteData as { count: number } | string)).toBeGreaterThanOrEqual(1);
    });

    it('should rename a record and verify the new name exists', async () => {
      const project = defaultProject();
      const originalId = 'contract_rename_source';
      const renamedId = 'contract_rename_target';

      // Cleanup any leftovers from previous runs
      await apiRequest(project.token, 'record', { action: 'delete', 'records[0]': originalId });
      await apiRequest(project.token, 'record', { action: 'delete', 'records[0]': renamedId });

      // Create source record
      const { status: createStatus } = await apiRequest(project.token, 'record', {
        action: 'import',
        data: JSON.stringify([{ study_id: originalId, first_name: 'Rename', last_name: 'Me' }]),
        type: 'flat',
        overwriteBehavior: 'overwrite',
      });

      if (createStatus !== 200) return;

      // Rename
      const { status, text } = await apiRequest(project.token, 'record', {
        action: 'rename',
        record: originalId,
        new_record_name: renamedId,
      });

      expect([200, 400]).toContain(status);

      if (status === 200) {
        // Verify the renamed record exists and the original is gone
        const { data: records } = await apiRequest(project.token, 'record', {
          records: renamedId,
          fields: 'study_id',
        });
        const found = (records as Array<Record<string, unknown>>).some(
          (r) => r['study_id'] === renamedId
        );
        expect(found).toBe(true);

        await apiRequest(project.token, 'record', { action: 'delete', 'records[0]': renamedId });
      } else {
        expect(isKnownApiError(text)).toBe(true);
        await apiRequest(project.token, 'record', { action: 'delete', 'records[0]': originalId });
      }
    });

    it('should generate next record name', async () => {
      const project = defaultProject();
      const { status, text } = await apiRequest(project.token, 'generateNextRecordName');

      expect(status).toBe(200);
      expect(text.trim()).toMatch(/^\d+$/);
    });

    it('should randomize a record (or return known error if not configured)', async () => {
      const project = defaultProject();
      const { data: records } = await apiRequest(project.token, 'record');
      const firstRecord = (records as Array<Record<string, unknown>>)[0];
      const recordId = String(firstRecord?.['study_id'] ?? firstRecord?.['record_id'] ?? '1');

      const { status, text } = await apiRequest(project.token, 'record', {
        action: 'randomize',
        record: recordId,
        arm: '1',
      });

      expect([200, 400, 403]).toContain(status);
      if (status !== 200) {
        expect(isKnownApiError(text)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Export Field Names
  // ---------------------------------------------------------------------------

  describe('Export Field Names endpoint', () => {
    it('should return array of field name mappings', async () => {
      const project = defaultProject();
      const { status, data } = await apiRequest(project.token, 'exportFieldNames');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should have correct structure', async () => {
      const project = defaultProject();
      const { data } = await apiRequest(project.token, 'exportFieldNames');

      const fields = data as Array<Record<string, unknown>>;
      if (fields.length > 0) {
        expect(fields[0]).toHaveProperty('original_field_name');
        expect(fields[0]).toHaveProperty('export_field_name');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Field Validation
  // ---------------------------------------------------------------------------

  describe('Field validation endpoint', () => {
    it('should return array of field validation types with full structure', async () => {
      const project = defaultProject();
      const { status, data } = await apiRequest(project.token, 'fieldValidation');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect((data as unknown[]).length).toBeGreaterThan(0);

      const entries = data as Array<Record<string, unknown>>;
      const first = entries[0];
      expect(first).toHaveProperty('validation_type');
      expect(first).toHaveProperty('regex');

      // All entries must have these keys
      for (const entry of entries) {
        expectStringField(entry, 'validation_type');
        expectStringField(entry, 'regex');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Arms
  // ---------------------------------------------------------------------------

  describe('Arm endpoint', () => {
    it('should export arms for longitudinal project', async () => {
      const longitudinal = longitudinalProject();
      if (!longitudinal) return;

      const { status, data } = await apiRequest(longitudinal.token, 'arm');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect((data as unknown[]).length).toBeGreaterThan(0);

      const arm = (data as Array<Record<string, unknown>>)[0];
      expect(arm).toHaveProperty('arm_num');
      expect(arm).toHaveProperty('name');
    });

    it('should return error for classic project', async () => {
      const classic = classicProject();
      if (!classic) return;

      const { text } = await apiRequest(classic.token, 'arm');
      expect(isKnownApiError(text)).toBe(true);
    });

    it('should import and delete an arm on longitudinal project', async () => {
      const longitudinal = longitudinalProject();
      if (!longitudinal) return;

      const { data: existing } = await apiRequest(longitudinal.token, 'arm');
      const arms = existing as Array<{ arm_num: number; name: string }>;
      const maxArmNum = Math.max(...arms.map((a) => a.arm_num));
      const newArmNum = maxArmNum + 1;

      const { status: importStatus } = await apiRequest(longitudinal.token, 'arm', {
        action: 'import',
        data: JSON.stringify([{ arm_num: newArmNum, name: 'Contract Test Arm' }]),
      });

      expect([200, 400]).toContain(importStatus);

      if (importStatus === 200) {
        const { status: deleteStatus } = await apiRequest(longitudinal.token, 'arm', {
          action: 'delete',
          'arms[0]': String(newArmNum),
        });
        expect([200, 400]).toContain(deleteStatus);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  describe('Event endpoint (longitudinal projects)', () => {
    it('should return events for longitudinal projects', async () => {
      const longitudinal = longitudinalProject();
      if (!longitudinal) return;

      const { status, data } = await apiRequest(longitudinal.token, 'event');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect((data as unknown[]).length).toBeGreaterThan(0);

      const event = (data as Array<Record<string, unknown>>)[0];
      expect(event).toHaveProperty('event_name');
      expect(event).toHaveProperty('arm_num');
    });

    it('should return error for classic projects', async () => {
      const classic = classicProject();
      if (!classic) return;

      const { text } = await apiRequest(classic.token, 'event');
      expect(text).toMatch(/error|You cannot export Events/i);
    });

    it('should import and delete an event on a longitudinal project', async () => {
      const longitudinal = longitudinalProject();
      if (!longitudinal) return;

      const eventName = 'Contract Test Event';
      const { data: armsData } = await apiRequest(longitudinal.token, 'arm');
      const arms = armsData as Array<{ arm_num: number }>;
      const armNum = arms[0]?.arm_num ?? 1;

      const { status: importStatus, text: importText } = await apiRequest(
        longitudinal.token,
        'event',
        {
          action: 'import',
          data: JSON.stringify([
            {
              event_name: eventName,
              arm_num: armNum,
              unique_event_name: '',
            },
          ]),
        }
      );

      expect([200, 400, 403]).toContain(importStatus);
      if (importStatus !== 200) {
        expect(isKnownApiError(importText)).toBe(true);
        return;
      }

      const { data: eventsAfterImport } = await apiRequest(longitudinal.token, 'event');
      const created = (eventsAfterImport as Array<Record<string, unknown>>).find(
        (event) => event['event_name'] === eventName
      );
      expect(created).toBeDefined();

      const uniqueEventName = String(created?.['unique_event_name'] ?? '');
      expect(uniqueEventName).not.toBe('');

      const { status: deleteStatus, text: deleteText } = await apiRequest(
        longitudinal.token,
        'event',
        {
          action: 'delete',
          'events[0]': uniqueEventName,
        }
      );

      expect([200, 400, 403]).toContain(deleteStatus);
      if (deleteStatus === 200) {
        const { data: eventsAfterDelete } = await apiRequest(longitudinal.token, 'event');
        const stillPresent = (eventsAfterDelete as Array<Record<string, unknown>>).some(
          (event) => event['unique_event_name'] === uniqueEventName
        );
        expect(stillPresent).toBe(false);
      } else {
        expect(isKnownApiError(deleteText)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Form-Event Mapping
  // ---------------------------------------------------------------------------

  describe('Form-Event Mapping endpoint', () => {
    it('should export form-event mappings for longitudinal project', async () => {
      const longitudinal = longitudinalProject();
      if (!longitudinal) return;

      const { status, data } = await apiRequest(longitudinal.token, 'formEventMapping');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);

      if ((data as unknown[]).length > 0) {
        const mapping = (data as Array<Record<string, unknown>>)[0];
        expect(mapping).toHaveProperty('arm_num');
        expect(mapping).toHaveProperty('unique_event_name');
        expect(mapping).toHaveProperty('form');
      }
    });

    it('should return error for classic project', async () => {
      const classic = classicProject();
      if (!classic) return;

      const { text } = await apiRequest(classic.token, 'formEventMapping');
      expect(isKnownApiError(text)).toBe(true);
    });

    it('should import form-event mapping and preserve mapping count', async () => {
      const longitudinal = longitudinalProject();
      if (!longitudinal) return;

      const { data: existing } = await apiRequest(longitudinal.token, 'formEventMapping');
      const mappings = existing as Array<Record<string, unknown>>;
      if (mappings.length === 0) return;
      const countBefore = mappings.length;

      const { status, text } = await apiRequest(longitudinal.token, 'formEventMapping', {
        action: 'import',
        data: JSON.stringify(mappings),
      });

      expect([200, 400]).toContain(status);
      if (status === 200) {
        const { data: after } = await apiRequest(longitudinal.token, 'formEventMapping');
        expect((after as unknown[]).length).toBe(countBefore);
      } else {
        expect(isKnownApiError(text)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Repeating Forms Events
  // ---------------------------------------------------------------------------

  describe('Repeating Forms endpoint', () => {
    it('should return repeating forms configuration with correct structure', async () => {
      const repeating = repeatingProject();
      if (!repeating) return;

      const { status, data } = await apiRequest(repeating.token, 'repeatingFormsEvents');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect((data as unknown[]).length).toBeGreaterThan(0);

      const item = (data as Array<Record<string, unknown>>)[0];
      expect(item).toHaveProperty('form_name');
      expect(item).toHaveProperty('custom_form_label');
    });

    it('should import repeating forms configuration and preserve count', async () => {
      const repeating = repeatingProject();
      if (!repeating) return;

      const { data: existing } = await apiRequest(repeating.token, 'repeatingFormsEvents');
      const config = existing as Array<Record<string, unknown>>;
      if (config.length === 0) return;
      const countBefore = config.length;

      const { status, text } = await apiRequest(repeating.token, 'repeatingFormsEvents', {
        action: 'import',
        data: JSON.stringify(config),
      });

      expect([200, 400]).toContain(status);
      if (status === 200) {
        const { data: after } = await apiRequest(repeating.token, 'repeatingFormsEvents');
        expect((after as unknown[]).length).toBe(countBefore);
      } else {
        expect(isKnownApiError(text)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------

  describe('User endpoint', () => {
    it('should return array of users', async () => {
      const project = defaultProject();
      const { status, data } = await apiRequest(project.token, 'user');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should include site_admin user', async () => {
      const project = defaultProject();
      const { data } = await apiRequest(project.token, 'user');

      const users = data as Array<{ username: string }>;
      const siteAdmin = users.find((u) => u.username === 'site_admin');
      expect(siteAdmin).toBeDefined();
    });

    it('should have correct user structure', async () => {
      const project = defaultProject();
      const { data } = await apiRequest(project.token, 'user');

      const users = data as Array<Record<string, unknown>>;
      expect(users[0]).toHaveProperty('username');
      expect(users[0]).toHaveProperty('email');
      expect(users[0]).toHaveProperty('expiration');
    });

    it('should import a user and delete them', async () => {
      const project = defaultProject();
      const testUser = 'contract_test_user';

      const { status: importStatus, text: importText } = await apiRequest(project.token, 'user', {
        action: 'import',
        data: JSON.stringify([
          {
            username: testUser,
            expiration: '',
            data_export: '1',
            forms_export: '',
          },
        ]),
      });

      expect([200, 400]).toContain(importStatus);

      if (importStatus === 200) {
        const { status: deleteStatus } = await apiRequest(project.token, 'user', {
          action: 'delete',
          'users[0]': testUser,
        });
        expect([200, 400]).toContain(deleteStatus);
      } else {
        expect(isKnownApiError(importText)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // User Roles
  // ---------------------------------------------------------------------------

  describe('User Role endpoint', () => {
    it('should export user roles', async () => {
      const project = defaultProject();
      const { status, data } = await apiRequest(project.token, 'userRole');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should import a user role and delete it', async () => {
      const project = defaultProject();
      const roleName = 'Contract Test Role';

      const { status: importStatus, data: importData } = await apiRequest(
        project.token,
        'userRole',
        {
          action: 'import',
          data: JSON.stringify([
            {
              unique_role_name: '',
              role_label: roleName,
              data_export: '1',
            },
          ]),
        }
      );

      expect([200, 400]).toContain(importStatus);

      if (importStatus === 200) {
        // Get the created role's unique_role_name
        const { data: roles } = await apiRequest(project.token, 'userRole');
        const created = (roles as Array<{ role_label: string; unique_role_name: string }>).find(
          (r) => r.role_label === roleName
        );

        if (created) {
          const { status: deleteStatus } = await apiRequest(project.token, 'userRole', {
            action: 'delete',
            'roles[0]': created.unique_role_name,
          });
          expect([200, 400]).toContain(deleteStatus);
        }
      } else {
        expect(isKnownApiError(String(importData))).toBe(true);
      }
    });

    it('should export user role mapping', async () => {
      const project = defaultProject();
      const { status, data } = await apiRequest(project.token, 'userRoleMapping');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should import user role mapping and preserve count', async () => {
      const project = defaultProject();
      const { data: existing } = await apiRequest(project.token, 'userRoleMapping');
      const mappings = existing as Array<Record<string, unknown>>;
      if (mappings.length === 0) return;
      const countBefore = mappings.length;

      const { status, text } = await apiRequest(project.token, 'userRoleMapping', {
        action: 'import',
        data: JSON.stringify(mappings),
      });

      expect([200, 400]).toContain(status);
      if (status === 200) {
        const { data: after } = await apiRequest(project.token, 'userRoleMapping');
        expect((after as unknown[]).length).toBe(countBefore);
      } else {
        expect(isKnownApiError(text)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // DAGs
  // ---------------------------------------------------------------------------

  describe('DAG endpoint', () => {
    it('should return array (possibly empty) of DAGs', async () => {
      const project = defaultProject();
      const { status, data } = await apiRequest(project.token, 'dag');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should import a DAG, export user-DAG mapping, then delete it', async () => {
      const project = defaultProject();
      const dagName = 'Contract Test DAG';

      const { status: importStatus, text: importText } = await apiRequest(project.token, 'dag', {
        action: 'import',
        data: JSON.stringify([{ dag_name: dagName, unique_group_name: '' }]),
      });

      expect([200, 400]).toContain(importStatus);

      if (importStatus === 200) {
        // Export user-DAG mapping
        const { status: mappingStatus, data: mappingData } = await apiRequest(
          project.token,
          'userDagMapping'
        );
        expect(mappingStatus).toBe(200);
        expect(Array.isArray(mappingData)).toBe(true);

        // Delete the DAG
        const { data: dags } = await apiRequest(project.token, 'dag');
        const created = (dags as Array<{ dag_name: string; unique_group_name: string }>).find(
          (d) => d.dag_name === dagName
        );

        if (created) {
          const { status: deleteStatus } = await apiRequest(project.token, 'dag', {
            action: 'delete',
            'dags[0]': created.unique_group_name,
          });
          expect([200, 400]).toContain(deleteStatus);
        }
      } else {
        expect(isKnownApiError(importText)).toBe(true);
      }
    });

    it('should import user-DAG mapping (or known error)', async () => {
      const project = defaultProject();
      const { data: mapping } = await apiRequest(project.token, 'userDagMapping');
      const rows = mapping as Array<Record<string, unknown>>;
      if (rows.length === 0) return;

      const { status, text } = await apiRequest(project.token, 'userDagMapping', {
        action: 'import',
        data: JSON.stringify(rows),
      });

      expect([200, 400]).toContain(status);
      if (status === 400) expect(isKnownApiError(text)).toBe(true);
    });

    it('should switch to a DAG then back to none', async () => {
      const project = defaultProject();
      const dagName = 'Contract Switch DAG';
      const { data: recordsBefore } = await apiRequest(project.token, 'record');
      const recordCountBefore = (recordsBefore as unknown[]).length;

      // Create a temporary DAG to switch to
      const { status: importStatus } = await apiRequest(project.token, 'dag', {
        action: 'import',
        data: JSON.stringify([{ dag_name: dagName, unique_group_name: '' }]),
      });

      if (importStatus === 200) {
        const { data: dags } = await apiRequest(project.token, 'dag');
        const created = (dags as Array<{ dag_name: string; unique_group_name: string }>).find(
          (d) => d.dag_name === dagName
        );

        if (created) {
          try {
            // Switch to DAG
            const { status: switchStatus, text: switchText } = await apiRequest(
              project.token,
              'dag',
              {
                action: 'switch',
                dag: created.unique_group_name,
              }
            );
            expect([200, 400, 403]).toContain(switchStatus);

            if (switchStatus === 200) {
              const { status: restrictedStatus, data: restrictedRecords } = await apiRequest(
                project.token,
                'record'
              );
              expect(restrictedStatus).toBe(200);
              expect((restrictedRecords as unknown[]).length).toBe(0);
            } else {
              expect(isKnownApiError(switchText)).toBe(true);
            }

            // Switch back to no DAG
            const { status: switchBackStatus, text: switchBackText } = await apiRequest(
              project.token,
              'dag',
              {
                action: 'switch',
                dag: '',
              }
            );
            expect([200, 400, 403]).toContain(switchBackStatus);

            if (switchBackStatus === 200) {
              const { status: restoredStatus, data: restoredRecords } = await apiRequest(
                project.token,
                'record'
              );
              expect(restoredStatus).toBe(200);
              expect((restoredRecords as unknown[]).length).toBe(recordCountBefore);
            } else {
              expect(isKnownApiError(switchBackText)).toBe(true);
            }
          } finally {
            await apiRequest(project.token, 'dag', {
              action: 'switch',
              dag: '',
            });
            await apiRequest(project.token, 'dag', {
              action: 'delete',
              'dags[0]': created.unique_group_name,
            });
          }
        }
      } else {
        // DAG import not supported on this project — just verify switch responds
        const { status, text } = await apiRequest(project.token, 'dag', {
          action: 'switch',
          dag: '',
        });
        expect([200, 400, 403]).toContain(status);
        if (status !== 200) expect(isKnownApiError(text)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Files
  // ---------------------------------------------------------------------------

  describe('File endpoint', () => {
    let fileFieldName: string | null = null;
    let fileRecordId: string | null = null;

    beforeAll(async () => {
      // Find a file upload field in the classic project
      const project = defaultProject();
      const { data } = await apiRequest(project.token, 'metadata');
      const fileField =
        project.capabilities?.fileUploadField ??
        (data as Array<Record<string, unknown>>).find((f) => f['field_type'] === 'file')?.[
          'field_name'
        ];

      if (fileField) {
        fileFieldName = String(fileField);
        const { data: records } = await apiRequest(project.token, 'record');
        const first = (records as Array<Record<string, unknown>>)[0];
        fileRecordId = getRecordId(first ?? {});
      }
    });

    it('should import a file to a record', async () => {
      if (!fileFieldName || !fileRecordId) return;
      const project = defaultProject();

      const fileContent = new Blob(['Contract test file content'], { type: 'text/plain' });
      const { status, text } = await apiRequestMultipart(
        project.token,
        {
          content: 'file',
          action: 'import',
          record: fileRecordId,
          field: fileFieldName,
          event: '',
        },
        'file',
        'contract-test.txt',
        fileContent
      );

      expect([200, 400]).toContain(status);
      if (status === 400) expect(isKnownApiError(text)).toBe(true);
    });

    it('should handle import_app requests for app-uploaded files', async () => {
      if (!fileFieldName || !fileRecordId) return;
      const project = defaultProject();

      const { status, text } = await apiRequest(project.token, 'file', {
        action: 'import_app',
        record: fileRecordId,
        field: fileFieldName,
        event: '',
      });

      expect([200, 400, 403]).toContain(status);
      if (status !== 200) expect(isKnownApiError(text)).toBe(true);
    });

    it('should export a file from a record', async () => {
      if (!fileFieldName || !fileRecordId) return;
      const project = defaultProject();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: project.token,
          content: 'file',
          action: 'export',
          record: fileRecordId,
          field: fileFieldName,
        }).toString(),
      });

      expect([200, 400]).toContain(response.status);
    });

    it('should delete a file from a record', async () => {
      if (!fileFieldName || !fileRecordId) return;
      const project = defaultProject();

      const { status, text } = await apiRequest(project.token, 'file', {
        action: 'delete',
        record: fileRecordId,
        field: fileFieldName,
      });

      expect([200, 400]).toContain(status);
      if (status === 400) expect(isKnownApiError(text)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // File Repository
  // ---------------------------------------------------------------------------

  describe('File Repository endpoint', () => {
    it('should list file repository with correct structure', async () => {
      const project = defaultProject();
      const { status, data } = await apiRequest(project.token, 'fileRepository', {
        action: 'list',
      });

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);

      const items = data as Array<Record<string, unknown>>;
      for (const item of items) {
        // Each item is either a file (has doc_id) or a folder (has folder_id)
        const isFile = 'doc_id' in item;
        const isFolder = 'folder_id' in item;
        expect(isFile || isFolder).toBe(true);
        expect(item).toHaveProperty('name');
      }
    });

    it('should create a folder, upload a file, inspect it, export it, then delete both', async () => {
      const project = defaultProject();

      // Create folder
      const { status: folderStatus, data: folderData } = await apiRequest(
        project.token,
        'fileRepository',
        {
          action: 'createFolder',
          name: 'Contract Test Folder',
        }
      );

      expect([200, 400]).toContain(folderStatus);

      const folderId =
        folderStatus === 200 ? String((folderData as { folder_id?: number })?.folder_id ?? '') : '';

      // Upload a file
      const fileContent = new Blob(['Repository test content'], { type: 'text/plain' });
      const { status: uploadStatus, data: uploadData } = await apiRequestMultipart(
        project.token,
        {
          content: 'fileRepository',
          action: 'import',
          ...(folderId ? { folder_id: folderId } : {}),
        },
        'file',
        'repo-contract-test.txt',
        fileContent
      );

      expect([200, 400]).toContain(uploadStatus);

      const docId =
        uploadStatus === 200 ? String((uploadData as { doc_id?: number })?.doc_id ?? '') : '';

      if (docId) {
        const { status: infoStatus, data: infoData } = await apiRequest(project.token, 'fileinfo', {
          action: 'export',
          doc_id: docId,
        });
        expect(infoStatus).toBe(200);
        expect(infoData).toBeTypeOf('object');
        expect(infoData).toHaveProperty('doc_id');

        const { status: sizeStatus, text: sizeText } = await apiRequest(project.token, 'filesize', {
          action: 'export',
          doc_id: docId,
        });
        expect(sizeStatus).toBe(200);
        expect(Number(sizeText.trim())).toBeGreaterThan(0);

        // Export the file
        const exportResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token: project.token,
            content: 'fileRepository',
            action: 'export',
            doc_id: docId,
          }).toString(),
        });
        expect(exportResponse.status).toBe(200);
        const exportedBytes = await exportResponse.arrayBuffer();
        expect(exportedBytes.byteLength).toBeGreaterThan(0);

        // Delete the file
        const { status: deleteStatus } = await apiRequest(project.token, 'fileRepository', {
          action: 'delete',
          doc_id: docId,
        });
        expect(deleteStatus).toBe(200);
      }

      if (folderId) {
        const { status: deleteFolderStatus, text: deleteFolderText } = await apiRequest(
          project.token,
          'fileRepository',
          {
            action: 'delete',
            folder_id: folderId,
          }
        );
        expect([200, 400]).toContain(deleteFolderStatus);
        if (deleteFolderStatus !== 200) expect(isKnownApiError(deleteFolderText)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Surveys
  // ---------------------------------------------------------------------------

  describe('Survey endpoints', () => {
    it('should return surveyLink (URL) or known error', async () => {
      const project = surveyProject();
      const { data: records } = await apiRequest(project.token, 'record');
      const first = (records as Array<Record<string, unknown>>)[0];
      const recordId = getRecordId(first ?? {});

      const { data: instruments } = await apiRequest(project.token, 'instrument');
      const firstInstrument = (instruments as Array<{ instrument_name: string }>)[0];
      const instrument =
        project.capabilities?.surveyInstrument ?? firstInstrument?.instrument_name ?? '';

      const { status, text } = await apiRequest(project.token, 'surveyLink', {
        record: recordId,
        instrument,
        event: project.capabilities?.surveyEvent ?? '',
      });

      expect([200, 400]).toContain(status);
      if (status === 200) {
        // A survey link must be a URL
        expect(text.trim()).toMatch(/^https?:\/\//);
      } else {
        expect(isKnownApiError(text)).toBe(true);
      }
    });

    it('should return surveyQueueLink (URL) or known error', async () => {
      const project = surveyProject();
      const { data: records } = await apiRequest(project.token, 'record');
      const first = (records as Array<Record<string, unknown>>)[0];
      const recordId = getRecordId(first ?? {});

      const { status, text } = await apiRequest(project.token, 'surveyQueueLink', {
        record: recordId,
      });

      expect([200, 400]).toContain(status);
      if (status === 200) {
        expect(text.trim()).toMatch(/^https?:\/\//);
      } else {
        expect(isKnownApiError(text)).toBe(true);
      }
    });

    it('should return surveyReturnCode (alphanumeric) or known error', async () => {
      const project = surveyProject();
      const { data: records } = await apiRequest(project.token, 'record');
      const first = (records as Array<Record<string, unknown>>)[0];
      const recordId = getRecordId(first ?? {});

      const { data: instruments } = await apiRequest(project.token, 'instrument');
      const firstInstrument = (instruments as Array<{ instrument_name: string }>)[0];
      const instrument =
        project.capabilities?.surveyInstrument ?? firstInstrument?.instrument_name ?? '';

      const { status, text } = await apiRequest(project.token, 'surveyReturnCode', {
        record: recordId,
        instrument,
        event: project.capabilities?.surveyEvent ?? '',
      });

      expect([200, 400]).toContain(status);
      if (status === 200) {
        // Return code is an alphanumeric string
        expect(text.trim()).toMatch(/^[A-Za-z0-9]+$/);
      } else {
        expect(isKnownApiError(text)).toBe(true);
      }
    });

    it('should return participantList (array) or known error', async () => {
      const project = surveyProject();
      const { data: instruments } = await apiRequest(project.token, 'instrument');
      const firstInstrument = (instruments as Array<{ instrument_name: string }>)[0];
      const instrument =
        project.capabilities?.surveyInstrument ?? firstInstrument?.instrument_name ?? '';

      const { status, data, text } = await apiRequest(project.token, 'participantList', {
        instrument,
        event: project.capabilities?.surveyEvent ?? '',
      });

      expect([200, 400]).toContain(status);
      if (status === 200) {
        const participants = expectObjectRows(data);
        for (const participant of participants) {
          expect(
            'record' in participant ||
              'participant_id' in participant ||
              'email' in participant ||
              'participant_email' in participant
          ).toBe(true);
        }
      } else {
        expect(isKnownApiError(text)).toBe(true);
      }
    });

    it('should return surveyAccessCode (alphanumeric) or known error', async () => {
      const project = surveyProject();
      const { data: records } = await apiRequest(project.token, 'record');
      const first = (records as Array<Record<string, unknown>>)[0];
      const recordId = getRecordId(first ?? {});

      const { data: instruments } = await apiRequest(project.token, 'instrument');
      const firstInstrument = (instruments as Array<{ instrument_name: string }>)[0];
      const instrument =
        project.capabilities?.surveyInstrument ?? firstInstrument?.instrument_name ?? '';

      const { status, text } = await apiRequest(project.token, 'surveyAccessCode', {
        record: recordId,
        instrument,
      });

      expect([200, 400]).toContain(status);
      if (status === 200) {
        expect(text.trim()).toMatch(/^[A-Za-z0-9]+$/);
      } else {
        expect(isKnownApiError(text)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Reports
  // ---------------------------------------------------------------------------

  describe('Report endpoint', () => {
    it('should return report data or known error if no reports exist', async () => {
      const project = defaultProject();
      const { status, data, text } = await apiRequest(project.token, 'report', {
        report_id: project.capabilities?.reportId ?? '1',
      });

      // 200 = report data, 400 = report not found
      expect([200, 400]).toContain(status);
      if (status === 200) {
        const rows = expectObjectRows(data);
        for (const row of rows) {
          expect(Object.keys(row).length).toBeGreaterThan(0);
        }
      } else {
        expect(isKnownApiError(text)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Logs
  // ---------------------------------------------------------------------------

  describe('Log endpoint', () => {
    it('should return array of log entries', async () => {
      const project = defaultProject();
      const { status, data } = await apiRequest(project.token, 'log');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should have correct log entry structure', async () => {
      const project = defaultProject();
      const { data } = await apiRequest(project.token, 'log');
      const entries = data as Array<Record<string, unknown>>;

      if (entries.length > 0) {
        const firstEntry = entries[0];
        if (!firstEntry) return;
        expect(firstEntry).toHaveProperty('timestamp');
        expect(firstEntry).toHaveProperty('username');
        expect(firstEntry).toHaveProperty('action');
        expectIsoLikeLogTimestamp(firstEntry['timestamp']);
      }
    });

    it('should support filtering logs by user', async () => {
      const project = defaultProject();
      const { status, data } = await apiRequest(project.token, 'log', { user: 'site_admin' });

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should support filtering logs by date range', async () => {
      const project = defaultProject();
      const { status, data } = await apiRequest(project.token, 'log', {
        beginTime: '2999-01-01 00:00',
        endTime: '2999-12-31 23:59',
      });

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data as unknown[]).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Project XML
  // ---------------------------------------------------------------------------

  describe('Project XML endpoint', () => {
    it('should export project XML', async () => {
      const project = defaultProject();
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: project.token,
          content: 'project_xml',
        }).toString(),
      });

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toContain('<?xml');
      expect(text).toContain(project.name);

      const { data: metadata } = await apiRequest(project.token, 'metadata');
      const firstFieldName = String(
        (metadata as Array<Record<string, unknown>>)[0]?.['field_name'] ?? ''
      );
      expect(firstFieldName).not.toBe('');
      expect(text).toContain(firstFieldName);
    });
  });

  // ---------------------------------------------------------------------------
  // App Rights Check
  // ---------------------------------------------------------------------------

  describe('appRightsCheck endpoint', () => {
    it('should return app rights or known error', async () => {
      const project = defaultProject();
      const { status, text } = await apiRequest(project.token, 'appRightsCheck');

      expect([200, 400]).toContain(status);
      if (status === 400) expect(isKnownApiError(text)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Endpoints with limited/optional availability
  // (mycap, tableau, projectMigration, attachment, authkey)
  // These respond with a recognisable error when the feature is not enabled.
  // ---------------------------------------------------------------------------

  describe('Optional / feature-gated endpoints', () => {
    it('authkey: should respond (200 or known error)', async () => {
      const project = defaultProject();
      const { status, text } = await apiRequest(project.token, 'authkey');
      expect([200, 400, 403]).toContain(status);
      if (status !== 200) expect(isKnownApiError(text)).toBe(true);
    });

    it('attachment: should respond (200 or known error)', async () => {
      const project = defaultProject();
      const { status, text } = await apiRequest(project.token, 'attachment', {
        action: 'export',
        record: '1',
        field: 'nonexistent_field',
      });
      expect([200, 400, 403]).toContain(status);
      if (status !== 200) expect(isKnownApiError(text)).toBe(true);
    });

    it('mycap: should respond (200 or known error)', async () => {
      const project = defaultProject();
      const { status, text } = await apiRequest(project.token, 'mycap', { action: 'display' });
      expect([200, 400, 401, 403]).toContain(status);
      if (status !== 200) expect(isKnownApiError(text)).toBe(true);
    });

    it('tableau: should respond (200 or known error)', async () => {
      const project = defaultProject();
      const { status, text } = await apiRequest(project.token, 'tableau', { action: 'display' });
      expect([200, 400, 403]).toContain(status);
      if (status !== 200) expect(isKnownApiError(text)).toBe(true);
    });

    it('projectMigration: should respond (200 or known error)', async () => {
      const project = defaultProject();
      const { status, text } = await apiRequest(project.token, 'projectMigration', {
        action: 'export',
      });
      expect([200, 400, 403]).toContain(status);
      if (status !== 200) expect(isKnownApiError(text)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  describe('Error handling', () => {
    it('should return error for invalid token', async () => {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: 'INVALID_TOKEN_12345678901234567890',
          content: 'version',
        }).toString(),
      });

      expect([400, 403]).toContain(response.status);
    });

    it('should return error for invalid content type', async () => {
      const project = defaultProject();
      const { text } = await apiRequest(project.token, 'invalid_content_type');

      expect(text).toMatch(/error|invalid/i);
    });
  });

  // ---------------------------------------------------------------------------
  // Response formats
  // ---------------------------------------------------------------------------

  describe('Response formats', () => {
    it('should support JSON format', async () => {
      const project = defaultProject();
      const { data } = await apiRequest(project.token, 'metadata');

      expect(Array.isArray(data)).toBe(true);
    });

    it('should support CSV format', async () => {
      const project = defaultProject();
      const params = new URLSearchParams({
        token: project.token,
        content: 'metadata',
        format: 'csv',
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const text = await response.text();
      expect(response.status).toBe(200);
      expect(text).toContain(',');
      expect(text).toContain('field_name');
    });

    it('should support XML format', async () => {
      const project = defaultProject();
      const params = new URLSearchParams({
        token: project.token,
        content: 'metadata',
        format: 'xml',
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const text = await response.text();
      expect(response.status).toBe(200);
      expect(text).toContain('<?xml');
    });

    it('should support CSV format for record export', async () => {
      const project = defaultProject();
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: project.token,
          content: 'record',
          format: 'csv',
        }).toString(),
      });

      const text = await response.text();
      expect(response.status).toBe(200);
      expect(text).toContain(',');
    });
  });
});
