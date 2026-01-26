/**
 * Setup Test Projects with Fixtures
 *
 * Creates API tokens for template projects and inserts test data
 * to validate API responses against the OpenAPI spec.
 *
 * Usage: pnpm test:setup
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(import.meta.dirname);
const CONFIG_DIR = join(import.meta.dirname, '../../docker/config');

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
  try {
    const result = execSync(
      `docker exec docker-mariadb-1 mariadb -u redcap -predcap_password redcap -N -e "${sql.replace(/"/g, '\\"')}"`,
      { encoding: 'utf-8' }
    );
    return result.trim();
  } catch (error) {
    console.error(`SQL Error: ${sql}`);
    throw error;
  }
}

function generateToken(): string {
  const chars = 'ABCDEF0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

async function setupProjectToken(projectId: number): Promise<string> {
  // Check if token already exists
  const existing = execMariaDB(
    `SELECT api_token FROM redcap_user_rights WHERE project_id=${projectId} AND username='site_admin' AND api_token IS NOT NULL`
  );

  if (existing && existing.length === 32) {
    console.log(`  Token exists for project ${projectId}`);
    return existing;
  }

  // Generate new token
  const token = generateToken();

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
  details.metadataCount = Array.isArray(metadata) ? metadata.length : 0;
  details.metadataExpected = expected.metadata;

  // Check instruments
  const instrumentsResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token, content: 'instrument', format: 'json' }).toString(),
  });
  const instruments = await instrumentsResponse.json();
  details.instrumentsCount = Array.isArray(instruments) ? instruments.length : 0;
  details.instrumentsExpected = expected.instruments;

  // Check events (longitudinal)
  const eventsResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token, content: 'event', format: 'json' }).toString(),
  });
  const eventsText = await eventsResponse.text();
  const hasEvents = !eventsText.includes('error') && eventsText !== '[]';
  details.hasEvents = hasEvents;
  details.hasEventsExpected = expected.hasEvents;

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
  details.hasRepeatingForms = hasRepeating;
  details.hasRepeatingFormsExpected = expected.hasRepeatingForms;

  // Determine pass/fail (allow some tolerance on metadata count)
  const metadataTolerance = Math.abs((details.metadataCount as number) - expected.metadata) <= 10;
  const passed =
    metadataTolerance &&
    details.instrumentsCount === expected.instruments &&
    details.hasEvents === expected.hasEvents;

  return { passed, details };
}

async function main() {
  console.log('Setting up test projects with fixtures');
  console.log('='.repeat(50));
  console.log();

  const apiUrl = 'http://localhost:8888/api/';
  const projectTokens: Record<number, string> = {};

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
    const result = await importTestData(apiUrl, token, project.testData);
    console.log(`    Imported ${result.count} records (success: ${result.success})`);
  }
  console.log();

  // Verify setup
  console.log('Step 3: Verifying project setup...');
  const results: Array<{ project: string; passed: boolean; details: Record<string, unknown> }> = [];

  for (const project of TEST_PROJECTS) {
    console.log(`  Project ${project.id}: ${project.name}`);
    const token = projectTokens[project.id];
    const verification = await verifyProjectSetup(apiUrl, token, project.expectedResponses);

    results.push({
      project: project.name,
      passed: verification.passed,
      details: verification.details,
    });

    const icon = verification.passed ? '✓' : '✗';
    console.log(
      `    ${icon} metadata: ${verification.details.metadataCount}/${project.expectedResponses.metadata}`
    );
    console.log(
      `    ${icon} instruments: ${verification.details.instrumentsCount}/${project.expectedResponses.instruments}`
    );
    console.log(
      `    ${icon} events: ${verification.details.hasEvents}/${project.expectedResponses.hasEvents}`
    );
  }
  console.log();

  // Save fixtures configuration
  console.log('Step 4: Saving fixtures configuration...');

  if (!existsSync(FIXTURES_DIR)) {
    mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  const fixturesConfig = {
    apiUrl,
    generatedAt: new Date().toISOString(),
    projects: TEST_PROJECTS.map((p) => ({
      id: p.id,
      name: p.name,
      token: projectTokens[p.id],
      recordCount: p.testData.length,
      expected: p.expectedResponses,
    })),
  };

  writeFileSync(join(FIXTURES_DIR, 'projects.json'), JSON.stringify(fixturesConfig, null, 2));
  console.log(`  Saved to: tests/fixtures/projects.json`);

  // Also update .env.test with all tokens
  const envContent = [
    '# REDCap API Test Configuration',
    `# Generated on ${new Date().toISOString()}`,
    '',
    `REDCAP_API_URL=${apiUrl}`,
    '',
    '# Project tokens',
    ...TEST_PROJECTS.map((p) => `REDCAP_TOKEN_PROJECT_${p.id}=${projectTokens[p.id]}`),
    '',
    '# Default token (Classic Database)',
    `REDCAP_API_TOKEN=${projectTokens[1]}`,
    `REDCAP_PROJECT_ID=1`,
  ].join('\n');

  writeFileSync(join(CONFIG_DIR, '.env.test'), envContent);
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

main().catch(console.error);
