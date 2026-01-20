#!/usr/bin/env npx tsx

/**
 * REDCap Connection Test CLI
 *
 * Tests connectivity via the redcap-service /health/detailed endpoint:
 * 1. Checks if the service is running
 * 2. Validates REDCap server connectivity
 * 3. Validates API token
 * 4. Shows sample data from the project
 *
 * Usage:
 *   pnpm test:redcap                    # Service must be running
 *   pnpm test:redcap --docker           # Starts Docker first
 */

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

// Load environment variables
const loadEnv = (): { baseUrl: string } => {
  const fs = require('fs');
  const path = require('path');

  const envPath = path.resolve(__dirname, '../.env.local');

  if (!fs.existsSync(envPath)) {
    log.error(`Missing .env.local at ${envPath}`);
    log.info('Create it from .env.example with your credentials');
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
  const { execSync } = require('child_process');

  log.step('Building Docker images...');
  execSync('pnpm docker:build', { stdio: 'inherit', cwd: __dirname + '/..' });

  log.step('Starting Docker containers...');
  execSync('pnpm docker -d', { stdio: 'inherit', cwd: __dirname + '/..' });

  log.step('Waiting for services to be healthy...');
  await new Promise((resolve) => setTimeout(resolve, 5000));
};

const stopDocker = async (): Promise<void> => {
  const { execSync } = require('child_process');
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
        log.title('Sample Data (first 3 records):');
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

// Main
const main = async () => {
  const args = process.argv.slice(2);
  const useDocker = args.includes('--docker');

  log.title('🔬 REDCap Connection Test');

  // Load environment
  const { baseUrl } = loadEnv();
  log.info(`Service URL: ${baseUrl}`);

  let dockerStarted = false;

  try {
    // Start Docker if requested
    if (useDocker) {
      await startDocker();
      dockerStarted = true;
    }

    // Step 1: Check service is running
    log.title('1. Service Status');
    const serviceOk = await checkServiceRunning(baseUrl);

    if (!serviceOk) {
      if (!useDocker) {
        log.info('Hint: Run with --docker to start the service automatically');
      }
      process.exit(1);
    }

    // Step 2: Get detailed health status
    log.title('2. Health Checks');
    const health = await getHealthStatus(baseUrl);

    if (!health) {
      log.error('Failed to retrieve health status');
      process.exit(1);
    }

    // Display checks
    displayCheck('REDCap Server', health.checks.redcap);
    displayCheck('API Token', health.checks.token);

    if (health.checks.internet) {
      displayCheck('Internet', health.checks.internet);
    }

    // Check if we should continue
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

    // Step 3: Show project info
    if (health.redcap) {
      log.title('3. Project Information');
      log.success(`REDCap version: ${health.redcap.version}`);
      log.success(`Project: "${health.redcap.project}"`);
      log.info(`Project ID: ${health.redcap.projectId}`);
    }

    // Step 4: Available instruments
    if (health.instruments && health.instruments.length > 0) {
      log.title('4. Available Instruments (Forms)');
      for (const instrument of health.instruments) {
        console.log(
          `  ${colors.cyan}•${colors.reset} ${colors.bold}${instrument.name}${colors.reset} - ${colors.dim}${instrument.label}${colors.reset}`
        );
      }
    }

    // Step 5: Available fields (grouped by form)
    if (health.fields && health.fields.length > 0) {
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
    log.title('6. Sample Records');
    await fetchSampleRecords(baseUrl);

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
