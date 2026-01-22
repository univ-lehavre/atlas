/* eslint-disable functional/no-let, functional/no-expression-statements, functional/no-conditional-statements, functional/no-try-statements, functional/no-loop-statements, unicorn/no-process-exit, n/no-process-exit, no-console, @typescript-eslint/strict-boolean-expressions, unicorn/no-negated-condition, turbo/no-undeclared-env-vars, unicorn/prefer-top-level-await -- CLI requires imperative code */
/**
 * CLI for network diagnostics
 */

import * as p from '@clack/prompts';
import pc from 'picocolors';
import { Effect } from 'effect';
import {
  dnsResolve,
  tcpPing,
  tlsHandshake,
  checkInternet,
  type DiagnosticStep,
} from './diagnostics.js';

interface RunOptions {
  readonly ci: boolean;
}

const formatStep = (step: DiagnosticStep, ci: boolean): string => {
  if (ci) {
    const status = step.status.toUpperCase().padEnd(5);
    const latency = step.latencyMs === undefined ? '' : ` ${String(step.latencyMs)}ms`;
    const message = step.message ? ` - ${step.message}` : '';
    return `[${status}] ${step.name}${latency}${message}`;
  }
  const icon =
    step.status === 'ok' ? pc.green('✓') : step.status === 'error' ? pc.red('✗') : pc.dim('○');
  const latency = step.latencyMs === undefined ? '' : pc.dim(` (${String(step.latencyMs)}ms)`);
  const message = step.message ? pc.dim(` → ${step.message}`) : '';
  return `${icon} ${step.name}${latency}${message}`;
};

const runDiagnostics = async (targetUrl: string, options: RunOptions): Promise<boolean> => {
  const { ci } = options;
  const url = new URL(targetUrl);
  const port =
    url.port !== '' ? Number.parseInt(url.port, 10) : url.protocol === 'https:' ? 443 : 80;
  const isHttps = url.protocol === 'https:';
  let hasError = false;

  const log = (step: DiagnosticStep): void => {
    if (step.status === 'error') hasError = true;
    console.log(formatStep(step, ci));
  };

  const runStep = async (
    name: string,
    effect: Effect.Effect<DiagnosticStep>
  ): Promise<DiagnosticStep> => {
    if (ci) {
      const step = await Effect.runPromise(effect);
      log(step);
      return step;
    }
    const spinner = p.spinner();
    spinner.start(name);
    const step = await Effect.runPromise(effect);
    spinner.stop(formatStep(step, ci));
    return step;
  };

  // Step 1: DNS Resolution
  const dnsStep = await runStep('DNS Resolution', dnsResolve(url.hostname));

  if (dnsStep.status === 'error') {
    await runStep('Internet Check', checkInternet());
    return !hasError;
  }

  // Step 2: TCP Connect
  const tcpStep = await runStep('TCP Connect', tcpPing(url.hostname, port));

  if (tcpStep.status === 'error') {
    await runStep('Internet Check', checkInternet());
    return !hasError;
  }

  // Step 3: TLS Handshake (HTTPS only)
  if (isHttps) {
    await runStep('TLS Handshake', tlsHandshake(url.hostname, port));
  }

  return !hasError;
};

const parseArgs = (
  args: string[]
): { target: string | null; ci: boolean; help: boolean; error: string | null } => {
  let target: string | null = null;
  let ci = false;
  let help = false;

  for (const arg of args) {
    if (arg === '--ci' || arg === '-c') {
      ci = true;
    } else if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg.startsWith('-')) {
      return { target: null, ci: false, help: false, error: `Unknown option: ${arg}` };
    } else {
      target = arg;
    }
  }

  return { target, ci, help, error: null };
};

const showHelp = (): void => {
  console.log(`
${pc.cyan('atlas-net')} - Network diagnostics CLI

${pc.bold('Usage:')}
  atlas-net [options] [url]

${pc.bold('Options:')}
  -c, --ci     CI mode (no interactive prompts, plain output)
  -h, --help   Show this help message

${pc.bold('Examples:')}
  atlas-net                          Interactive mode
  atlas-net https://example.com      Diagnose URL
  atlas-net --ci https://example.com CI mode with exit code
`);
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const { target, ci, help, error } = parseArgs(args);

  if (error) {
    console.error(pc.red(error));
    process.exit(1);
  }

  if (help) {
    showHelp();
    process.exit(0);
  }

  // Auto-detect CI mode if not interactive
  const isCi = ci || !process.stdout.isTTY || Boolean(process.env['CI']);

  if (!isCi) {
    p.intro(pc.cyan('Atlas Network Diagnostics'));
  }

  let targetUrl = target;

  if (targetUrl) {
    try {
      new URL(targetUrl);
    } catch {
      if (isCi) {
        console.error(`Error: Invalid URL: ${targetUrl}`);
      } else {
        p.log.error(`Invalid URL: ${targetUrl}`);
      }
      process.exit(1);
    }
  } else {
    if (isCi) {
      console.error('Error: URL required in CI mode');
      process.exit(1);
    }

    const input = await p.text({
      message: 'Enter target URL to diagnose',
      placeholder: 'https://example.com',
      validate: (value) => {
        try {
          new URL(value);
        } catch {
          return 'Please enter a valid URL';
        }
      },
    });

    if (p.isCancel(input)) {
      p.cancel('Cancelled');
      process.exit(0);
    }

    targetUrl = input;
  }

  const success = await runDiagnostics(targetUrl, { ci: isCi });

  if (!isCi) {
    p.outro(pc.dim('Done'));
  }

  process.exit(success ? 0 : 1);
};

main().catch((error: unknown) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
/* eslint-enable functional/no-let, functional/no-expression-statements, functional/no-conditional-statements, functional/no-try-statements, functional/no-loop-statements, unicorn/no-process-exit, n/no-process-exit, no-console, @typescript-eslint/strict-boolean-expressions, unicorn/no-negated-condition, turbo/no-undeclared-env-vars, unicorn/prefer-top-level-await */
