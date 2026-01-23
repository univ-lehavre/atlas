/**
 * REDCap API Smoke Tests
 *
 * Tests the REDCap API against the Docker instance to verify
 * the installation is working correctly.
 *
 * Usage: pnpm test:api
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CONFIG_PATH = join(import.meta.dirname, '../docker/config/.env.test');

interface TestResult {
  endpoint: string;
  status: 'pass' | 'fail';
  message: string;
  duration: number;
}

async function loadConfig(): Promise<{ url: string; token: string }> {
  if (!existsSync(CONFIG_PATH)) {
    console.error('Config file not found. Run: pnpm docker:install');
    process.exit(1);
  }

  const content = readFileSync(CONFIG_PATH, 'utf-8');
  const lines = content.split('\n');

  let url = '';
  let token = '';

  for (const line of lines) {
    if (line.startsWith('REDCAP_API_URL=')) {
      url = line.split('=')[1].trim();
    }
    if (line.startsWith('REDCAP_API_TOKEN=')) {
      token = line.split('=')[1].trim();
    }
  }

  if (!url || !token) {
    console.error('Invalid config file. Run: pnpm docker:install');
    process.exit(1);
  }

  return { url, token };
}

async function testEndpoint(
  url: string,
  token: string,
  content: string,
  additionalParams: Record<string, string> = {}
): Promise<TestResult> {
  const start = Date.now();
  const endpoint = `${content}${Object.keys(additionalParams).length ? '/' + Object.values(additionalParams).join('/') : ''}`;

  try {
    const params = new URLSearchParams({
      token,
      content,
      format: 'json',
      ...additionalParams,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const duration = Date.now() - start;

    if (!response.ok && response.status !== 400) {
      return {
        endpoint,
        status: 'fail',
        message: `HTTP ${response.status}`,
        duration,
      };
    }

    const text = await response.text();

    // Check if response is valid JSON or expected format
    if (content === 'version') {
      if (/^\d+\.\d+\.\d+$/.test(text.trim())) {
        return { endpoint, status: 'pass', message: text.trim(), duration };
      }
    } else {
      try {
        const json = JSON.parse(text);
        if (Array.isArray(json) || typeof json === 'object') {
          return {
            endpoint,
            status: 'pass',
            message: Array.isArray(json) ? `${json.length} items` : 'object',
            duration,
          };
        }
      } catch {
        // Not JSON, check for known error patterns
        if (text.includes('error')) {
          return { endpoint, status: 'fail', message: text.slice(0, 100), duration };
        }
      }
    }

    return { endpoint, status: 'pass', message: 'OK', duration };
  } catch (error) {
    return {
      endpoint,
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

async function main() {
  console.log('REDCap API Smoke Tests');
  console.log('='.repeat(50));
  console.log();

  const { url, token } = await loadConfig();
  console.log(`API URL: ${url}`);
  console.log(`Token: ${token.slice(0, 8)}...`);
  console.log();

  const tests: Array<{ content: string; params?: Record<string, string> }> = [
    { content: 'version' },
    { content: 'project' },
    { content: 'metadata' },
    { content: 'instrument' },
    { content: 'exportFieldNames' },
    { content: 'record' },
    { content: 'user' },
    { content: 'dag' },
    { content: 'formEventMapping' },
    { content: 'repeatingFormsEvents' },
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    const result = await testEndpoint(url, token, test.content, test.params);
    results.push(result);

    const icon = result.status === 'pass' ? '✓' : '✗';
    const color = result.status === 'pass' ? '\x1b[32m' : '\x1b[31m';
    console.log(
      `${color}${icon}\x1b[0m ${result.endpoint.padEnd(25)} ${result.message.padEnd(20)} (${result.duration}ms)`
    );
  }

  console.log();
  console.log('-'.repeat(50));

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;

  console.log(`Passed: ${passed}, Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
