#!/usr/bin/env npx tsx

/**
 * REDCap Connection Test CLI
 *
 * Tests connectivity via the redcap-service /health/detailed endpoint.
 *
 * Usage:
 *   pnpm test:redcap                    # Interactive mode
 *   pnpm test:redcap --all              # Run all tests
 *   pnpm test:redcap --quick            # Quick check (service + health only)
 *   pnpm test:redcap --docker           # Starts Docker first
 *   pnpm test:redcap --json             # Output results as JSON
 *
 * Test selection flags:
 *   --service      Check service connectivity
 *   --health       Check REDCap server and token
 *   --project      Show project information
 *   --instruments  List available instruments
 *   --fields       List available fields
 *   --records      Fetch sample records
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✔${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✖${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg: string) =>
    console.log(`${colors.cyan}→${colors.reset} ${colors.dim}${msg}${colors.reset}`),
  title: (msg: string) => console.log(`\n${colors.bold}${msg}${colors.reset}\n`),
  json: (data: unknown) => console.log(JSON.stringify(data, null, 2)),
};

// Test options
interface TestOptions {
  docker: boolean;
  json: boolean;
  service: boolean;
  health: boolean;
  project: boolean;
  instruments: boolean;
  fields: boolean;
  records: boolean;
}

// JSON output structure
interface JsonOutput {
  success: boolean;
  timestamp: string;
  serviceUrl: string;
  tests: {
    service?: { ok: boolean };
    health?: HealthResponse;
    project?: { version: string; name: string; id: number };
    instruments?: InstrumentInfo[];
    fields?: Record<string, FieldInfo[]>;
    records?: { count: number; sample: unknown[] };
  };
  error?: string;
}

const TEST_CATEGORIES = [
  { key: 'service', label: 'Service connectivity', description: 'Check if service is running' },
  { key: 'health', label: 'Health checks', description: 'REDCap server and token validation' },
  { key: 'project', label: 'Project info', description: 'Show REDCap version and project details' },
  { key: 'instruments', label: 'Instruments', description: 'List available forms' },
  { key: 'fields', label: 'Fields', description: 'List available fields by form' },
  { key: 'records', label: 'Sample records', description: 'Fetch first 3 records' },
] as const;

interface HealthCheck {
  name: string;
  status: 'ok' | 'degraded' | 'error';
  latencyMs?: number;
  message?: string;
}

interface InstrumentInfo {
  name: string;
  label: string;
}

interface FieldInfo {
  name: string;
  form: string;
  type: string;
  label: string;
}

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  checks: {
    redcap: HealthCheck;
    token: HealthCheck;
    internet?: HealthCheck;
  };
  redcap?: {
    version: string;
    project: string;
    projectId: number;
  };
  instruments?: InstrumentInfo[];
  fields?: FieldInfo[];
}

// Interactive menu
const showInteractiveMenu = async (): Promise<TestOptions> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  log.title('🔬 REDCap Test Selection');
  console.log('Select tests to run:\n');
  console.log(`  ${colors.cyan}1${colors.reset} Quick check (service + health)`);
  console.log(`  ${colors.cyan}2${colors.reset} Full test (all checks)`);
  console.log(`  ${colors.cyan}3${colors.reset} Custom selection\n`);

  const choice = await question(`${colors.bold}Choice [1-3]:${colors.reset} `);

  if (choice === '1') {
    rl.close();
    return {
      docker: false,
      json: false,
      service: true,
      health: true,
      project: false,
      instruments: false,
      fields: false,
      records: false,
    };
  }

  if (choice === '2') {
    rl.close();
    return {
      docker: false,
      json: false,
      service: true,
      health: true,
      project: true,
      instruments: true,
      fields: true,
      records: true,
    };
  }

  // Custom selection
  console.log('\nSelect individual tests (y/n):\n');

  const options: TestOptions = {
    docker: false,
    json: false,
    service: true, // Always required
    health: false,
    project: false,
    instruments: false,
    fields: false,
    records: false,
  };

  for (const cat of TEST_CATEGORIES) {
    if (cat.key === 'service') {
      console.log(
        `  ${colors.green}✔${colors.reset} ${cat.label} ${colors.dim}(required)${colors.reset}`
      );
      continue;
    }

    const answer = await question(
      `  ${colors.cyan}?${colors.reset} ${cat.label} ${colors.dim}(${cat.description})${colors.reset} [y/N]: `
    );
    options[cat.key as keyof TestOptions] = answer.toLowerCase() === 'y';
  }

  rl.close();
  return options;
};

// Parse command line arguments
const parseArgs = (): TestOptions | 'interactive' => {
  const args = process.argv.slice(2);

  // No args = interactive mode
  if (args.length === 0 || (args.length === 1 && args[0] === '--docker')) {
    return 'interactive';
  }

  const options: TestOptions = {
    docker: args.includes('--docker'),
    json: args.includes('--json'),
    service: true, // Always run
    health: false,
    project: false,
    instruments: false,
    fields: false,
    records: false,
  };

  // Preset modes
  if (args.includes('--all')) {
    return {
      ...options,
      health: true,
      project: true,
      instruments: true,
      fields: true,
      records: true,
    };
  }

  if (args.includes('--quick')) {
    return {
      ...options,
      health: true,
    };
  }

  // Individual flags
  if (args.includes('--health')) options.health = true;
  if (args.includes('--project')) options.project = true;
  if (args.includes('--instruments')) options.instruments = true;
  if (args.includes('--fields')) options.fields = true;
  if (args.includes('--records')) options.records = true;

  // If only --docker was passed, default to all
  const testFlags = [
    '--health',
    '--project',
    '--instruments',
    '--fields',
    '--records',
    '--all',
    '--quick',
  ];
  if (!testFlags.some((f) => args.includes(f))) {
    return {
      ...options,
      health: true,
      project: true,
      instruments: true,
      fields: true,
      records: true,
    };
  }

  return options;
};

// Load environment variables
const loadEnv = (): { baseUrl: string } => {
  const envPath = path.resolve(__dirname, '../.env.local');

  if (!fs.existsSync(envPath)) {
    log.error(`Missing .env.local at ${envPath}`);
    log.info('Create it with: baseUrl=http://localhost:3000');
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        env[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
      }
    }
  }

  const baseUrl = env.baseUrl ?? 'http://localhost:3000';
  return { baseUrl };
};

// Docker management
const startDocker = async (): Promise<void> => {
  log.step('Building Docker images...');
  execSync('pnpm docker:build', { stdio: 'inherit', cwd: __dirname + '/..' });

  log.step('Starting Docker containers...');
  execSync('pnpm docker -d', { stdio: 'inherit', cwd: __dirname + '/..' });

  log.step('Waiting for services to be healthy...');
  await new Promise((resolve) => setTimeout(resolve, 5000));
};

const stopDocker = async (): Promise<void> => {
  log.step('Stopping Docker containers...');
  execSync('pnpm docker:down', { stdio: 'inherit', cwd: __dirname + '/..' });
};

// Check service is running
const checkServiceRunning = async (baseUrl: string): Promise<boolean> => {
  log.step(`Checking service at ${baseUrl}...`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${baseUrl}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      log.success('Service is running');
      return true;
    } else {
      log.error(`Service returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        log.error('Service not responding (timeout)');
      } else {
        log.error(`Cannot connect to service: ${error.message}`);
      }
    }
    return false;
  }
};

// Get detailed health status
const getHealthStatus = async (baseUrl: string): Promise<HealthResponse | null> => {
  log.step('Fetching detailed health status...');

  try {
    const response = await fetch(`${baseUrl}/health/detailed`);
    const data: HealthResponse = await response.json();
    return data;
  } catch (error) {
    log.error(`Failed to get health status: ${error instanceof Error ? error.message : error}`);
    return null;
  }
};

// Display health check result
const displayCheck = (name: string, check: HealthCheck): void => {
  const statusIcon =
    check.status === 'ok'
      ? `${colors.green}✔${colors.reset}`
      : check.status === 'degraded'
        ? `${colors.yellow}⚠${colors.reset}`
        : `${colors.red}✖${colors.reset}`;

  let line = `${statusIcon} ${name}`;

  if (check.latencyMs !== undefined) {
    const latencyColor = check.latencyMs > 1000 ? colors.yellow : colors.dim;
    line += ` ${latencyColor}(${check.latencyMs}ms)${colors.reset}`;
  }

  if (check.message) {
    line += ` - ${colors.dim}${check.message}${colors.reset}`;
  }

  console.log(line);
};

// Fetch sample records
const fetchSampleRecords = async (baseUrl: string): Promise<void> => {
  log.step('Fetching sample records...');

  try {
    const response = await fetch(`${baseUrl}/api/v1/records`);

    if (response.ok) {
      const result = await response.json();
      const records = result.data;
      const count = Array.isArray(records) ? records.length : 0;

      log.success(`Found ${count} record(s)`);

      if (count > 0) {
        console.log(`\n${colors.dim}First 3 records:${colors.reset}`);
        const sample = records.slice(0, 3);
        log.json(sample);
      }
    } else {
      const error = await response.json();
      log.warn(`Could not fetch records: ${error.error?.message ?? 'Unknown error'}`);
    }
  } catch (error) {
    log.warn(`Error fetching records: ${error instanceof Error ? error.message : error}`);
  }
};

// Fetch records and return data
const fetchRecords = async (
  baseUrl: string
): Promise<{ count: number; sample: unknown[] } | null> => {
  try {
    const response = await fetch(`${baseUrl}/api/v1/records`);
    if (response.ok) {
      const result = await response.json();
      const records = result.data;
      const count = Array.isArray(records) ? records.length : 0;
      return { count, sample: records.slice(0, 3) };
    }
    return null;
  } catch {
    return null;
  }
};

// Main
const main = async () => {
  const parsedArgs = parseArgs();
  let options: TestOptions;

  if (parsedArgs === 'interactive') {
    options = await showInteractiveMenu();
    options.docker = process.argv.includes('--docker');
  } else {
    options = parsedArgs;
  }

  // Load environment
  const { baseUrl } = loadEnv();

  // JSON output mode
  if (options.json) {
    const output: JsonOutput = {
      success: false,
      timestamp: new Date().toISOString(),
      serviceUrl: baseUrl,
      tests: {},
    };

    let dockerStarted = false;

    try {
      if (options.docker) {
        await startDocker();
        dockerStarted = true;
      }

      // Service check
      const serviceOk = await checkServiceRunning(baseUrl).catch(() => false);
      output.tests.service = { ok: serviceOk };

      if (!serviceOk) {
        output.error = 'Service not running';
        console.log(JSON.stringify(output, null, 2));
        process.exit(1);
      }

      // Health check
      if (options.health || options.project || options.instruments || options.fields) {
        const health = await getHealthStatus(baseUrl);
        if (health) {
          output.tests.health = health;

          if (options.project && health.redcap) {
            output.tests.project = {
              version: health.redcap.version,
              name: health.redcap.project,
              id: health.redcap.projectId,
            };
          }

          if (options.instruments && health.instruments) {
            output.tests.instruments = health.instruments;
          }

          if (options.fields && health.fields) {
            output.tests.fields = health.fields.reduce(
              (acc, field) => {
                if (!acc[field.form]) acc[field.form] = [];
                acc[field.form].push(field);
                return acc;
              },
              {} as Record<string, FieldInfo[]>
            );
          }

          if (health.status === 'error') {
            output.error = 'Health check failed';
            console.log(JSON.stringify(output, null, 2));
            process.exit(1);
          }
        }
      }

      // Records
      if (options.records) {
        const records = await fetchRecords(baseUrl);
        if (records) {
          output.tests.records = records;
        }
      }

      output.success = true;
      console.log(JSON.stringify(output, null, 2));
    } finally {
      if (dockerStarted) {
        await stopDocker();
      }
    }
    return;
  }

  // Normal output mode
  log.title('🔬 REDCap Connection Test');

  // Show selected tests
  const selected = TEST_CATEGORIES.filter((cat) => options[cat.key as keyof TestOptions]).map(
    (cat) => cat.label
  );
  log.info(`Tests: ${selected.join(', ')}`);
  log.info(`Service URL: ${baseUrl}`);

  let dockerStarted = false;
  let health: HealthResponse | null = null;

  try {
    // Start Docker if requested
    if (options.docker) {
      await startDocker();
      dockerStarted = true;
    }

    // Step 1: Check service is running (always)
    log.title('1. Service Status');
    const serviceOk = await checkServiceRunning(baseUrl);

    if (!serviceOk) {
      if (!options.docker) {
        log.info('Hint: Run with --docker to start the service automatically');
      }
      process.exit(1);
    }

    // Step 2: Health checks
    if (options.health || options.project || options.instruments || options.fields) {
      log.title('2. Health Checks');
      health = await getHealthStatus(baseUrl);

      if (!health) {
        log.error('Failed to retrieve health status');
        process.exit(1);
      }

      displayCheck('REDCap Server', health.checks.redcap);
      displayCheck('API Token', health.checks.token);

      if (health.checks.internet) {
        displayCheck('Internet', health.checks.internet);
      }

      if (health.status === 'error') {
        log.title('❌ Health checks failed');

        if (health.checks.redcap.status === 'error') {
          log.error('Cannot reach REDCap server');

          if (health.checks.internet?.status === 'error') {
            log.info('→ No internet connectivity detected');
          } else {
            log.info('→ Check REDCAP_API_URL in your configuration');
          }
        }

        if (health.checks.token.status === 'error') {
          log.error('Invalid API token');
          log.info('→ Check REDCAP_API_TOKEN in your configuration');
        }

        process.exit(1);
      }

      if (health.status === 'degraded') {
        log.warn('Health checks passed with warnings');
      }
    }

    // Step 3: Project info
    if (options.project && health?.redcap) {
      log.title('3. Project Information');
      log.success(`REDCap version: ${health.redcap.version}`);
      log.success(`Project: "${health.redcap.project}"`);
      log.info(`Project ID: ${health.redcap.projectId}`);
    }

    // Step 4: Instruments
    if (options.instruments && health?.instruments && health.instruments.length > 0) {
      log.title('4. Available Instruments (Forms)');
      for (const instrument of health.instruments) {
        console.log(
          `  ${colors.cyan}•${colors.reset} ${colors.bold}${instrument.name}${colors.reset} - ${colors.dim}${instrument.label}${colors.reset}`
        );
      }
    }

    // Step 5: Fields
    if (options.fields && health?.fields && health.fields.length > 0) {
      log.title('5. Available Fields');
      const fieldsByForm = health.fields.reduce(
        (acc, field) => {
          if (!acc[field.form]) acc[field.form] = [];
          acc[field.form].push(field);
          return acc;
        },
        {} as Record<string, FieldInfo[]>
      );

      for (const [formName, fields] of Object.entries(fieldsByForm)) {
        console.log(`\n  ${colors.bold}${formName}${colors.reset}:`);
        for (const field of fields.slice(0, 10)) {
          const typeLabel = `[${field.type}]`;
          console.log(`    ${colors.dim}${typeLabel.padEnd(12)}${colors.reset} ${field.name}`);
        }
        if (fields.length > 10) {
          console.log(`    ${colors.dim}... and ${fields.length - 10} more fields${colors.reset}`);
        }
      }
    }

    // Step 6: Sample records
    if (options.records) {
      log.title('6. Sample Records');
      await fetchSampleRecords(baseUrl);
    }

    log.title('✅ All checks passed!');
  } finally {
    // Stop Docker if we started it
    if (dockerStarted) {
      await stopDocker();
    }
  }
};

main().catch((error) => {
  log.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
