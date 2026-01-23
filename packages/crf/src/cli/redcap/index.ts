#!/usr/bin/env node
/**
 * CRF REDCap CLI - Test REDCap connectivity directly
 *
 * Usage:
 *   crf-redcap                    # Uses REDCAP_API_URL and REDCAP_API_TOKEN from env
 *   crf-redcap --url <url>        # Override URL
 *   crf-redcap --token <token>    # Override token
 *   crf-redcap --json             # JSON output
 *   crf-redcap --help             # Show help
 */

import { runTests } from './commands.js';

const DEFAULT_URL = process.env['REDCAP_API_URL'] ?? 'http://localhost:8080/api';
const DEFAULT_TOKEN = process.env['REDCAP_API_TOKEN'] ?? '';

interface CliArgs {
  readonly url: string;
  readonly token: string;
  readonly jsonOutput: boolean;
  readonly showHelp: boolean;
}

const parseArgs = (args: readonly string[]): CliArgs => {
  const urlIndex = args.findIndex((arg) => arg === '--url' || arg === '-u');
  const tokenIndex = args.findIndex((arg) => arg === '--token' || arg === '-t');

  const url = urlIndex !== -1 ? (args[urlIndex + 1] ?? DEFAULT_URL) : DEFAULT_URL;
  const token = tokenIndex !== -1 ? (args[tokenIndex + 1] ?? DEFAULT_TOKEN) : DEFAULT_TOKEN;
  const jsonOutput = args.includes('--json') || args.includes('-j');
  const showHelp = args.includes('--help') || args.includes('-h');

  return { url, token, jsonOutput, showHelp };
};

const showHelpMessage = (): void => {
  console.log(`
🔬 CRF REDCap CLI - Test REDCap connectivity directly

Usage:
  crf-redcap                     Run connectivity tests
  crf-redcap --url <url>         Override REDCAP_API_URL
  crf-redcap --token <token>     Override REDCAP_API_TOKEN
  crf-redcap --json              Output results as JSON
  crf-redcap --help              Show this help

Environment Variables:
  REDCAP_API_URL                 REDCap API URL (default: http://localhost:8080/api)
  REDCAP_API_TOKEN               REDCap API token (required)

Options:
  -u, --url <url>                REDCap API URL
  -t, --token <token>            REDCap API token
  -j, --json                     Output results as JSON
  -h, --help                     Show help
`);
};

const main = async (): Promise<void> => {
  const { url, token, jsonOutput, showHelp } = parseArgs(process.argv.slice(2));

  if (showHelp) {
    showHelpMessage();
    return;
  }

  if (token === '') {
    console.error('Error: REDCAP_API_TOKEN is required (set via env or --token)');
    process.exit(1);
  }

  await runTests({ url, token, jsonOutput });
};

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
