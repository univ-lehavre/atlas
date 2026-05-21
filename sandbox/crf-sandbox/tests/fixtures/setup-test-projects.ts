/**
 * Setup Test Projects with Fixtures
 *
 * Creates API tokens for template projects and inserts test data
 * to validate API responses against the OpenAPI spec.
 *
 * Usage: pnpm test:setup
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  mintSuperToken,
  createProject,
  importDataDictionary,
  tokenMatchesProject,
} from './redcap-admin.js';

const FIXTURES_DIR = join(import.meta.dirname);
const CONFIG_DIR = join(import.meta.dirname, '../../docker/config');
const REPO_ROOT = join(import.meta.dirname, '../../../..');
const AMARRE_DICT_PATH = join(REPO_ROOT, 'data-dictionaries/127-amarre-v1.json');
const AMARRE_PROJECT_TITLE = 'amarre';

interface ProjectSetup {
  id: number;
  name: string;
  description: string;
  testData: Record<string, unknown>[];
  expectedResponses: {
    metadata: number; // expected field count
    instruments: number; // expected instrument count
    hasEvents: boolean;
    hasRepeatingForms: boolean;
    hasSurveys: boolean;
  };
}

interface ProjectCapabilities {
  reportId?: string;
  surveyInstrument?: string;
  surveyEvent?: string;
  fileUploadField?: string;
}

const GENERATED_AT = '2026-01-01T00:00:00.000Z';

const PROJECT_TOKENS: Record<number, string> = {
  1: '3ED422AB16AFD8815A729EA57E56254B',
  2: '2E1DFDF3F8C17DB540FDCF4AF6ABA2F1',
  5: '4FF635F5D6984910DC2842F01DFA201B',
  12: '05D2B58D2FA1B1F4F4D84B9537F0DE1E',
};

// Test project configurations - based on actual REDCap template structures
const TEST_PROJECTS: ProjectSetup[] = [
  {
    id: 1,
    name: 'Classic Database',
    description: 'Basic data entry with 6 forms',
    testData: [
      {
        study_id: '1',
        first_name: 'John',
        last_name: 'Doe',
        date_enrolled: '2024-01-15',
        demographics_complete: '2',
      },
      {
        study_id: '2',
        first_name: 'Jane',
        last_name: 'Smith',
        date_enrolled: '2024-01-20',
        demographics_complete: '2',
      },
      {
        study_id: '3',
        first_name: 'Bob',
        last_name: 'Wilson',
        date_enrolled: '2024-02-01',
        demographics_complete: '1',
      },
    ],
    expectedResponses: {
      metadata: 113,
      instruments: 6,
      hasEvents: false,
      hasRepeatingForms: false,
      hasSurveys: false,
    },
  },
  {
    id: 2,
    name: 'Longitudinal Database (1 arm)',
    description: 'Longitudinal with 8 events (Enrollment, Dose 1-3, Visit 1-3, Final)',
    testData: [
      {
        study_id: '101',
        redcap_event_name: 'enrollment_arm_1',
        first_name: 'Alice',
        last_name: 'Johnson',
        date_enrolled: '2024-01-10',
        demographics_complete: '2',
      },
      {
        study_id: '102',
        redcap_event_name: 'enrollment_arm_1',
        first_name: 'Charlie',
        last_name: 'Brown',
        date_enrolled: '2024-01-15',
        demographics_complete: '2',
      },
    ],
    expectedResponses: {
      metadata: 90,
      instruments: 8,
      hasEvents: true,
      hasRepeatingForms: false,
      hasSurveys: false,
    },
  },
  {
    id: 5,
    name: 'Basic Demography',
    description: 'Single form with basic fields',
    testData: [
      {
        record_id: '1',
        first_name: 'Test',
        last_name: 'User',
        demographics_complete: '2',
      },
      {
        record_id: '2',
        first_name: 'Another',
        last_name: 'Person',
        demographics_complete: '2',
      },
    ],
    expectedResponses: {
      metadata: 15, // Updated based on actual template
      instruments: 1,
      hasEvents: false,
      hasRepeatingForms: false,
      hasSurveys: false,
    },
  },
  {
    id: 12,
    name: 'Repeating Instruments',
    description:
      'Example with 5 forms (4 repeating: medications, family_members, visits, adverse_events)',
    testData: [
      {
        record_id: '1',
        redcap_repeat_instrument: '',
        redcap_repeat_instance: '',
        first_name: 'Patient',
        last_name: 'One',
        demographics_complete: '2',
      },
      {
        record_id: '1',
        redcap_repeat_instrument: 'medications',
        redcap_repeat_instance: '1',
        medication_name: 'Aspirin',
        medications_complete: '2',
      },
      {
        record_id: '1',
        redcap_repeat_instrument: 'visits',
        redcap_repeat_instance: '1',
        visit_date: '2024-01-15',
        visits_complete: '2',
      },
    ],
    expectedResponses: {
      metadata: 36, // Updated based on actual template
      instruments: 5, // demographics, medications, family_members, visits, adverse_events
      hasEvents: false,
      hasRepeatingForms: true,
      hasSurveys: false,
    },
  },
];

function execMariaDB(sql: string): string {
  // Pass the SQL as a separate argv item to `execFileSync` instead of
  // interpolating it into a shell command. No shell is spawned, so
  // there's no command-line-injection vector (cf. CodeQL alert #12,
  // `js/command-line-injection`). The legacy SQL-based fixtures for
  // generic REDCap test projects (1, 2, 5, 12) are kept here as-is ;
  // the amarre fixtures (cf. `setupAmarreProject`) use the REDCap API
  // exclusively, per the project's no-SQL policy.
  try {
    const result = execFileSync(
      'docker',
      [
        'exec',
        'docker-mariadb-1',
        'mariadb',
        '-u',
        'redcap',
        '-predcap_password',
        'redcap',
        '-N',
        '-e',
        sql,
      ],
      { encoding: 'utf-8' }
    );
    return result.trim();
  } catch (error) {
    console.error(`SQL Error: ${sql}`);
    throw error;
  }
}

function sqlLiteral(value: number | string): string {
  if (typeof value === 'number') return String(value);
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

function tableExists(tableName: string): boolean {
  const count = execMariaDB(`
    SELECT COUNT(*)
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = ${sqlLiteral(tableName)}
  `);
  return Number(count) > 0;
}

function getTableColumns(tableName: string): Set<string> {
  try {
    const rows = execMariaDB(`SHOW COLUMNS FROM ${tableName}`);
    return new Set(
      rows
        .split('\n')
        .map((row) => row.split('\t')[0])
        .filter((column): column is string => Boolean(column))
    );
  } catch {
    return new Set();
  }
}

function insertKnownColumns(tableName: string, values: Record<string, number | string>): boolean {
  const columns = getTableColumns(tableName);
  const entries = Object.entries(values).filter(([column]) => columns.has(column));

  if (entries.length === 0) return false;

  execMariaDB(`
    INSERT INTO ${tableName}
    (${entries.map(([column]) => column).join(', ')})
    VALUES (${entries.map(([, value]) => sqlLiteral(value)).join(', ')})
  `);
  return true;
}

async function getInstruments(
  apiUrl: string,
  token: string
): Promise<Array<Record<string, unknown>>> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token, content: 'instrument', format: 'json' }).toString(),
  });
  const data = await response.json();
  return Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
}

async function getMetadata(apiUrl: string, token: string): Promise<Array<Record<string, unknown>>> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token, content: 'metadata', format: 'json' }).toString(),
  });
  const data = await response.json();
  return Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
}

async function ensureReportFixture(project: ProjectSetup): Promise<string | undefined> {
  if (!tableExists('redcap_reports')) return undefined;

  const existing = execMariaDB(`
    SELECT report_id
    FROM redcap_reports
    WHERE project_id = ${project.id}
    ORDER BY report_id
    LIMIT 1
  `);

  if (existing) return existing.split('\n')[0];

  const title = 'API Contract Test Report';

  try {
    insertKnownColumns('redcap_reports', {
      project_id: project.id,
      title,
      report_order: 1,
      user_access: 'ALL',
      user_edit_access: 'ALL',
      role_access: '',
      role_edit_access: '',
      fields: 'study_id,record_id,first_name,last_name',
      ordering: '',
      filtering_logic: '',
    });

    const created = execMariaDB(`
      SELECT report_id
      FROM redcap_reports
      WHERE project_id = ${project.id}
        AND title = ${sqlLiteral(title)}
      ORDER BY report_id DESC
      LIMIT 1
    `);

    return created ? created.split('\n')[0] : undefined;
  } catch (error) {
    console.warn(`  Could not create report fixture for project ${project.id}: ${String(error)}`);
    return undefined;
  }
}

async function ensureSurveyFixture(
  apiUrl: string,
  project: ProjectSetup,
  token: string
): Promise<Pick<ProjectCapabilities, 'surveyInstrument' | 'surveyEvent'>> {
  if (!tableExists('redcap_surveys')) return {};

  const instruments = await getInstruments(apiUrl, token);
  const instrumentName = String(instruments[0]?.['instrument_name'] ?? '');
  if (!instrumentName) return {};

  try {
    const projectColumns = getTableColumns('redcap_projects');
    if (projectColumns.has('surveys_enabled')) {
      execMariaDB(`
        UPDATE redcap_projects
        SET surveys_enabled = 1
        WHERE project_id = ${project.id}
      `);
    }

    const existing = execMariaDB(`
      SELECT survey_id
      FROM redcap_surveys
      WHERE project_id = ${project.id}
        AND form_name = ${sqlLiteral(instrumentName)}
      LIMIT 1
    `);

    if (!existing) {
      insertKnownColumns('redcap_surveys', {
        project_id: project.id,
        form_name: instrumentName,
        title: 'API Contract Test Survey',
        instructions: 'Survey fixture generated for API contract tests.',
        acknowledgement: 'Thank you.',
        question_by_section: 0,
        survey_enabled: 1,
        view_results: 0,
        min_responses_view_results: 10,
        check_diversity_view_results: 0,
      });
    }

    return { surveyInstrument: instrumentName };
  } catch (error) {
    console.warn(`  Could not create survey fixture for project ${project.id}: ${String(error)}`);
    return {};
  }
}

async function detectProjectCapabilities(
  apiUrl: string,
  project: ProjectSetup,
  token: string
): Promise<ProjectCapabilities> {
  const metadata = await getMetadata(apiUrl, token);
  const fileUploadField = metadata.find((field) => field['field_type'] === 'file')?.['field_name'];
  const reportId = await ensureReportFixture(project);
  const survey = await ensureSurveyFixture(apiUrl, project, token);

  return {
    ...(reportId ? { reportId } : {}),
    ...(survey.surveyInstrument ? survey : {}),
    ...(fileUploadField ? { fileUploadField: String(fileUploadField) } : {}),
  };
}

async function setupProjectToken(projectId: number): Promise<string> {
  const token = PROJECT_TOKENS[projectId];
  if (!token) throw new Error(`No deterministic API token configured for project ${projectId}`);

  // Check if token already exists
  const existing = execMariaDB(
    `SELECT api_token FROM redcap_user_rights WHERE project_id=${projectId} AND username='site_admin' AND api_token IS NOT NULL`
  );

  if (existing === token) {
    console.log(`  Token exists for project ${projectId}`);
    return existing;
  }

  // Insert or update user rights with token
  execMariaDB(`
    INSERT INTO redcap_user_rights
    (project_id, username, api_token, api_export, api_import, data_export_tool, data_import_tool, data_logging, user_rights, design, alerts, graphical, data_quality_design)
    VALUES (${projectId}, 'site_admin', '${token}', 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)
    ON DUPLICATE KEY UPDATE api_token='${token}', api_export=1, api_import=1
  `);

  console.log(`  Created token for project ${projectId}`);
  return token;
}

async function importTestData(
  apiUrl: string,
  token: string,
  data: Record<string, unknown>[]
): Promise<{ success: boolean; count: number }> {
  try {
    const params = new URLSearchParams({
      token,
      content: 'record',
      format: 'json',
      type: 'flat',
      data: JSON.stringify(data),
      overwriteBehavior: 'overwrite',
      returnContent: 'count',
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const text = await response.text();

    if (!response.ok) {
      console.error(`    Import failed: ${text}`);
      return { success: false, count: 0 };
    }

    const result = JSON.parse(text);
    return { success: true, count: result.count || data.length };
  } catch (error) {
    console.error(`    Import error: ${error}`);
    return { success: false, count: 0 };
  }
}

async function verifyProjectSetup(
  apiUrl: string,
  token: string,
  expected: ProjectSetup['expectedResponses']
): Promise<{ passed: boolean; details: Record<string, unknown> }> {
  const details: Record<string, unknown> = {};

  // Check metadata
  const metadataResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token, content: 'metadata', format: 'json' }).toString(),
  });
  const metadata = await metadataResponse.json();
  details['metadataCount'] = Array.isArray(metadata) ? metadata.length : 0;
  details['metadataExpected'] = expected.metadata;

  // Check instruments
  const instrumentsResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token, content: 'instrument', format: 'json' }).toString(),
  });
  const instruments = await instrumentsResponse.json();
  details['instrumentsCount'] = Array.isArray(instruments) ? instruments.length : 0;
  details['instrumentsExpected'] = expected.instruments;

  // Check events (longitudinal)
  const eventsResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token, content: 'event', format: 'json' }).toString(),
  });
  const eventsText = await eventsResponse.text();
  const hasEvents = !eventsText.includes('error') && eventsText !== '[]';
  details['hasEvents'] = hasEvents;
  details['hasEventsExpected'] = expected.hasEvents;

  // Check repeating forms
  const repeatingResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      token,
      content: 'repeatingFormsEvents',
      format: 'json',
    }).toString(),
  });
  const repeatingText = await repeatingResponse.text();
  const hasRepeating =
    !repeatingText.includes('error') && repeatingText !== '[]' && repeatingText !== '';
  details['hasRepeatingForms'] = hasRepeating;
  details['hasRepeatingFormsExpected'] = expected.hasRepeatingForms;

  // Determine pass/fail (allow some tolerance on metadata count)
  const metadataTolerance =
    Math.abs((details['metadataCount'] as number) - expected.metadata) <= 10;
  const passed =
    metadataTolerance &&
    details['instrumentsCount'] === expected.instruments &&
    details['hasEvents'] === expected.hasEvents;

  return { passed, details };
}

/**
 * Read an existing REDCap amarre token from `.env.test`, if any. Used
 * to make `setupAmarreProject()` idempotent across `pnpm test:setup`
 * runs without recreating the project.
 */
function readCachedAmarreToken(): string | undefined {
  const envPath = join(CONFIG_DIR, '.env.test');
  if (!existsSync(envPath)) return undefined;
  const raw = readFileSync(envPath, 'utf8');
  const m = raw.match(/^REDCAP_TOKEN_PROJECT_AMARRE=([A-Fa-f0-9]{32})$/m);
  return m?.[1];
}

/**
 * Provision the `amarre` REDCap project end-to-end, API-only :
 *   1. mint (or reuse) the super-API token for site_admin
 *   2. create the project via POST /api/?content=project&action=import
 *   3. import the amarre data dictionary
 *
 * Idempotent : if a cached token in `.env.test` still points at a
 * project titled "amarre", we reuse it without recreating anything.
 */
async function setupAmarreProject(
  apiUrl: string,
  baseUrl: string
): Promise<{ token: string; recordCount: number }> {
  const cached = readCachedAmarreToken();
  if (cached && (await tokenMatchesProject(apiUrl, cached, AMARRE_PROJECT_TITLE))) {
    console.log('  Reusing cached amarre token');
    return { token: cached, recordCount: 0 };
  }

  console.log('  Minting super-API token for site_admin');
  const superToken = await mintSuperToken(baseUrl);

  console.log('  Creating amarre project via API');
  const token = await createProject(apiUrl, superToken, {
    project_title: AMARRE_PROJECT_TITLE,
    purpose: '3', // Quality Improvement
    project_language: 'English',
  });

  console.log('  Importing amarre data dictionary');
  const { imported, dropped } = await importDataDictionary(apiUrl, token, AMARRE_DICT_PATH);
  console.log(`    ${imported} fields imported (${dropped} placeholders dropped)`);

  return { token, recordCount: 0 };
}

async function main() {
  console.log('Setting up test projects with fixtures');
  console.log('='.repeat(50));
  console.log();

  const baseUrl = 'http://localhost:8888';
  const apiUrl = `${baseUrl}/api/`;
  const projectTokens: Record<number, string> = {};
  const projectCapabilities: Record<number, ProjectCapabilities> = {};

  // Setup tokens for each test project
  console.log('Step 1: Creating API tokens...');
  for (const project of TEST_PROJECTS) {
    console.log(`  Project ${project.id}: ${project.name}`);
    const token = await setupProjectToken(project.id);
    projectTokens[project.id] = token;
  }
  console.log();

  // Import test data
  console.log('Step 2: Importing test data...');
  for (const project of TEST_PROJECTS) {
    console.log(`  Project ${project.id}: ${project.name}`);
    const token = projectTokens[project.id];
    if (!token) throw new Error(`Missing token for project ${project.id}`);
    const result = await importTestData(apiUrl, token, project.testData);
    console.log(`    Imported ${result.count} records (success: ${result.success})`);
  }
  console.log();

  console.log('Step 3: Preparing optional API fixtures...');
  for (const project of TEST_PROJECTS) {
    console.log(`  Project ${project.id}: ${project.name}`);
    const token = projectTokens[project.id];
    if (!token) throw new Error(`Missing token for project ${project.id}`);
    const capabilities = await detectProjectCapabilities(apiUrl, project, token);
    projectCapabilities[project.id] = capabilities;
    console.log(`    Capabilities: ${JSON.stringify(capabilities)}`);
  }
  console.log();

  // Verify setup
  console.log('Step 4: Verifying project setup...');
  const results: Array<{ project: string; passed: boolean; details: Record<string, unknown> }> = [];

  for (const project of TEST_PROJECTS) {
    console.log(`  Project ${project.id}: ${project.name}`);
    const token = projectTokens[project.id];
    if (!token) throw new Error(`Missing token for project ${project.id}`);
    const verification = await verifyProjectSetup(apiUrl, token, project.expectedResponses);

    results.push({
      project: project.name,
      passed: verification.passed,
      details: verification.details,
    });

    const icon = verification.passed ? '✓' : '✗';
    console.log(
      `    ${icon} metadata: ${String(verification.details['metadataCount'])}/${project.expectedResponses.metadata}`
    );
    console.log(
      `    ${icon} instruments: ${String(verification.details['instrumentsCount'])}/${project.expectedResponses.instruments}`
    );
    console.log(
      `    ${icon} events: ${String(verification.details['hasEvents'])}/${project.expectedResponses.hasEvents}`
    );
  }
  console.log();

  // Provision the amarre project via API (no SQL). Lives outside the
  // TEST_PROJECTS loop because the amarre project doesn't exist as a
  // REDCap template — it's created from scratch via super-API token.
  console.log('Step 4.5: Provisioning amarre project (API-only)...');
  const amarre = await setupAmarreProject(apiUrl, baseUrl);
  console.log();

  // Save fixtures configuration
  console.log('Step 5: Saving fixtures configuration...');

  if (!existsSync(FIXTURES_DIR)) {
    mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  const fixturesConfig = {
    apiUrl,
    generatedAt: GENERATED_AT,
    projects: TEST_PROJECTS.map((p) => ({
      id: p.id,
      name: p.name,
      token: projectTokens[p.id] ?? '',
      recordCount: p.testData.length,
      capabilities: projectCapabilities[p.id] ?? {},
      expected: {
        ...p.expectedResponses,
        hasSurveys: Boolean(projectCapabilities[p.id]?.surveyInstrument),
      },
    })),
    amarre: {
      title: AMARRE_PROJECT_TITLE,
      token: amarre.token,
      recordCount: amarre.recordCount,
    },
  };

  writeFileSync(
    join(FIXTURES_DIR, 'projects.json'),
    `${JSON.stringify(fixturesConfig, null, 2)}\n`
  );
  console.log(`  Saved to: tests/fixtures/projects.json`);

  // Also update .env.test with all tokens
  const envContent = [
    '# REDCap API Test Configuration',
    `# Generated on ${GENERATED_AT}`,
    '',
    `REDCAP_API_URL=${apiUrl}`,
    '',
    '# Project tokens',
    ...TEST_PROJECTS.map((p) => `REDCAP_TOKEN_PROJECT_${p.id}=${projectTokens[p.id]}`),
    '',
    '# Amarre project (provisioned via API, no SQL)',
    `REDCAP_TOKEN_PROJECT_AMARRE=${amarre.token}`,
    '',
    '# Default token (Classic Database)',
    `REDCAP_API_TOKEN=${projectTokens[1] ?? ''}`,
    `REDCAP_PROJECT_ID=1`,
  ].join('\n');

  writeFileSync(join(CONFIG_DIR, '.env.test'), `${envContent}\n`);
  console.log(`  Updated: docker/config/.env.test`);

  console.log();
  console.log('='.repeat(50));
  const passed = results.filter((r) => r.passed).length;
  console.log(`Setup complete: ${passed}/${results.length} projects verified`);

  if (passed < results.length) {
    console.log('\nFailed verifications:');
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  - ${r.project}: ${JSON.stringify(r.details)}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
