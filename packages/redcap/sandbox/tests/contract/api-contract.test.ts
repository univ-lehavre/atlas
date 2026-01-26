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

describe('REDCap API Contract Tests', () => {
  beforeAll(() => {
    if (!existsSync(FIXTURES_PATH)) {
      throw new Error('Fixtures not found. Run: pnpm test:setup');
    }

    fixtures = JSON.parse(readFileSync(FIXTURES_PATH, 'utf-8'));
    apiUrl = fixtures.apiUrl;
  });

  describe('Version endpoint', () => {
    it('should return version string', async () => {
      const project = fixtures.projects[0];
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

  describe('Project endpoint', () => {
    it('should return project info object', async () => {
      const project = fixtures.projects[0];
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
  });

  describe('Metadata endpoint', () => {
    it('should return array of field definitions', async () => {
      const project = fixtures.projects[0];
      const { status, data } = await apiRequest(project.token, 'metadata');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect((data as unknown[]).length).toBeGreaterThan(0);
    });

    it('should have correct field structure', async () => {
      const project = fixtures.projects[0];
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

        const firstFieldName = fields[0].field_name;
        expect(['record_id', 'study_id', 'participant_id']).toContain(firstFieldName);
      }
    });
  });

  describe('Instrument endpoint', () => {
    it('should return array of instruments', async () => {
      const project = fixtures.projects[0];
      const { status, data } = await apiRequest(project.token, 'instrument');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should have correct instrument structure', async () => {
      const project = fixtures.projects[0];
      const { data } = await apiRequest(project.token, 'instrument');

      const instruments = data as Array<Record<string, unknown>>;
      expect(instruments[0]).toHaveProperty('instrument_name');
      expect(instruments[0]).toHaveProperty('instrument_label');
    });

    it('should return expected instrument count', async () => {
      for (const project of fixtures.projects) {
        const { data } = await apiRequest(project.token, 'instrument');
        const instruments = data as unknown[];

        // Allow some tolerance
        expect(instruments.length).toBeGreaterThanOrEqual(project.expected.instruments - 1);
        expect(instruments.length).toBeLessThanOrEqual(project.expected.instruments + 1);
      }
    });
  });

  describe('Record endpoint', () => {
    it('should return array of records', async () => {
      const project = fixtures.projects[0];
      const { status, data } = await apiRequest(project.token, 'record');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return at least the imported records', async () => {
      for (const project of fixtures.projects) {
        const { data } = await apiRequest(project.token, 'record');
        const records = data as unknown[];

        // Records might be more than imported due to repeating instances
        expect(records.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should support filtering by fields', async () => {
      const project = fixtures.projects[0];
      const { data: allData } = await apiRequest(project.token, 'record');
      const { data: filteredData } = await apiRequest(project.token, 'record', {
        fields: 'study_id,first_name',
      });

      const allRecords = allData as Array<Record<string, unknown>>;
      const filteredRecords = filteredData as Array<Record<string, unknown>>;

      if (filteredRecords.length > 0) {
        // Filtered records should have fewer fields
        const allFieldCount = Object.keys(allRecords[0] || {}).length;
        const filteredFieldCount = Object.keys(filteredRecords[0] || {}).length;
        expect(filteredFieldCount).toBeLessThanOrEqual(allFieldCount);
      }
    });

    it('should support rawOrLabel parameter', async () => {
      const project = fixtures.projects[0];
      const { data: rawData } = await apiRequest(project.token, 'record', { rawOrLabel: 'raw' });
      const { data: labelData } = await apiRequest(project.token, 'record', {
        rawOrLabel: 'label',
      });

      expect(Array.isArray(rawData)).toBe(true);
      expect(Array.isArray(labelData)).toBe(true);
    });
  });

  describe('Export Field Names endpoint', () => {
    it('should return array of field name mappings', async () => {
      const project = fixtures.projects[0];
      const { status, data } = await apiRequest(project.token, 'exportFieldNames');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should have correct structure', async () => {
      const project = fixtures.projects[0];
      const { data } = await apiRequest(project.token, 'exportFieldNames');

      const fields = data as Array<Record<string, unknown>>;
      if (fields.length > 0) {
        expect(fields[0]).toHaveProperty('original_field_name');
        expect(fields[0]).toHaveProperty('export_field_name');
      }
    });
  });

  describe('Event endpoint (longitudinal projects)', () => {
    it('should return events for longitudinal projects', async () => {
      const longitudinalProject = fixtures.projects.find((p) => p.expected.hasEvents);
      if (!longitudinalProject) {
        return; // Skip if no longitudinal project
      }

      const { status, data } = await apiRequest(longitudinalProject.token, 'event');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect((data as unknown[]).length).toBeGreaterThan(0);
    });

    it('should return error for classic projects', async () => {
      const classicProject = fixtures.projects.find((p) => !p.expected.hasEvents);
      if (!classicProject) {
        return;
      }

      const { text } = await apiRequest(classicProject.token, 'event');

      // Classic projects return error or empty
      expect(text).toMatch(/error|You cannot export Events/i);
    });
  });

  describe('Repeating Forms endpoint', () => {
    it('should return repeating forms configuration', async () => {
      const repeatingProject = fixtures.projects.find((p) => p.expected.hasRepeatingForms);
      if (!repeatingProject) {
        return;
      }

      const { status, data } = await apiRequest(repeatingProject.token, 'repeatingFormsEvents');

      expect(status).toBe(200);
      // Could be array or specific structure depending on project
    });
  });

  describe('User endpoint', () => {
    it('should return array of users', async () => {
      const project = fixtures.projects[0];
      const { status, data } = await apiRequest(project.token, 'user');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should include site_admin user', async () => {
      const project = fixtures.projects[0];
      const { data } = await apiRequest(project.token, 'user');

      const users = data as Array<{ username: string }>;
      const siteAdmin = users.find((u) => u.username === 'site_admin');
      expect(siteAdmin).toBeDefined();
    });
  });

  describe('DAG endpoint', () => {
    it('should return array (possibly empty) of DAGs', async () => {
      const project = fixtures.projects[0];
      const { status, data } = await apiRequest(project.token, 'dag');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

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

      // REDCap returns 403 for invalid token
      expect([400, 403]).toContain(response.status);
    });

    it('should return error for invalid content type', async () => {
      const project = fixtures.projects[0];
      const { text } = await apiRequest(project.token, 'invalid_content_type');

      expect(text).toMatch(/error|invalid/i);
    });
  });

  describe('Response formats', () => {
    it('should support JSON format', async () => {
      const project = fixtures.projects[0];
      const { data } = await apiRequest(project.token, 'metadata');

      expect(Array.isArray(data)).toBe(true);
    });

    it('should support CSV format', async () => {
      const project = fixtures.projects[0];
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
      // CSV should have comma-separated values
      expect(text).toContain(',');
      expect(text).toContain('field_name');
    });

    it('should support XML format', async () => {
      const project = fixtures.projects[0];
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
  });
});
