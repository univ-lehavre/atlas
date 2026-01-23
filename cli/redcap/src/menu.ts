/* eslint-disable functional/no-expression-statements, functional/no-conditional-statements, functional/no-loop-statements, functional/immutable-data, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition, no-console, unicorn/prefer-single-call, @typescript-eslint/no-invalid-void-type, unicorn/no-immediate-mutation -- CLI menu requires imperative code */
/**
 * Interactive menu for REDCap CLI using @clack/prompts
 */

import * as p from '@clack/prompts';
import * as readline from 'node:readline';
import pc from 'picocolors';
import { Effect, Console } from 'effect';
import { style, format, icon } from './terminal.js';
import { RedcapService, type HealthResponse, type Field, type DiagnosticStep } from './services.js';

// ============================================================================
// Display Helpers
// ============================================================================

const groupFieldsByForm = (fields: readonly Field[]): Record<string, readonly Field[]> => {
  const result: Record<string, Field[]> = {};
  for (const field of fields) {
    const existing = result[field.form_name];
    result[field.form_name] = existing === undefined ? [field] : [...existing, field];
  }
  return result;
};

const formatHealthResult = (health: HealthResponse): string => {
  const lines: string[] = [];
  const statusIcon =
    health.status === 'ok' ? icon.success : health.status === 'degraded' ? icon.warn : icon.error;

  lines.push(`${statusIcon} Overall status: ${style.bold(health.status)}`);
  lines.push(`  Timestamp: ${style.dim(health.timestamp)}`, '', 'Checks:');
  lines.push(
    `  ${health.checks.redcap.status === 'ok' ? icon.success : icon.error} REDCap Server` +
      (health.checks.redcap.latencyMs === undefined
        ? ''
        : ` ${style.dim(`(${String(health.checks.redcap.latencyMs)}ms)`)}`),
    `  ${health.checks.token.status === 'ok' ? icon.success : icon.error} API Token`
  );

  if (health.checks.internet !== undefined) {
    lines.push(`  ${health.checks.internet.status === 'ok' ? icon.success : icon.error} Internet`);
  }

  return lines.join('\n');
};

const formatProjectInfo = (health: HealthResponse): string => {
  const redcap = health.redcap;
  if (redcap === undefined) {
    return format.warn('Project info not available');
  }

  const lines: string[] = [];
  lines.push(style.bold('Project Information'));
  lines.push(`  Version:    ${style.cyan(redcap.version)}`);
  lines.push(`  Project:    ${style.cyan(redcap.project)}`);
  lines.push(`  Project ID: ${style.cyan(String(redcap.projectId))}`);
  return lines.join('\n');
};

const formatInstruments = (health: HealthResponse): string => {
  const instruments = health.instruments;
  if (instruments === undefined || instruments.length === 0) {
    return format.warn('No instruments available');
  }

  const lines: string[] = [];
  lines.push(`${style.bold('Instruments')} (${String(instruments.length)})`);
  for (const instrument of instruments) {
    lines.push(
      `  ${style.cyan('•')} ${instrument.instrument_name} - ${style.dim(instrument.instrument_label)}`
    );
  }
  return lines.join('\n');
};

const formatFields = (health: HealthResponse): string => {
  const fields = health.fields;
  if (fields === undefined || fields.length === 0) {
    return format.warn('No fields available');
  }

  const lines: string[] = [];
  lines.push(`${style.bold('Fields')} (${String(fields.length)} total)`);
  const byForm = groupFieldsByForm(fields);

  for (const [formName, formFields] of Object.entries(byForm)) {
    lines.push('');
    lines.push(`  ${style.bold(formName)}:`);
    const displayed = formFields.slice(0, 5);
    for (const field of displayed) {
      lines.push(`    ${style.dim(`[${field.field_type}]`.padEnd(12))} ${field.field_name}`);
    }
    if (formFields.length > 5) {
      lines.push(`    ${style.dim(`... and ${String(formFields.length - 5)} more`)}`);
    }
  }
  return lines.join('\n');
};

// ============================================================================
// Menu Actions with Spinner
// ============================================================================

const withSpinner = <A, E>(
  message: string,
  effect: Effect.Effect<A, E, RedcapService>
): Effect.Effect<A, E, RedcapService> =>
  Effect.gen(function* () {
    const s = p.spinner();
    s.start(message);
    const result = yield* effect.pipe(
      Effect.tap(() => Effect.sync(() => s.stop(format.success(message)))),
      Effect.tapError(() => Effect.sync(() => s.stop(format.error(message))))
    );
    return result;
  });

const formatDiagnosticStep = (step: DiagnosticStep): string => {
  const statusIcon =
    step.status === 'ok' ? icon.success : step.status === 'error' ? icon.error : icon.warn;
  const latency =
    step.latencyMs === undefined ? '' : ` ${style.dim(`(${String(step.latencyMs)}ms)`)}`;
  const message = step.message ? ` ${style.dim(`- ${step.message}`)}` : '';
  return `${statusIcon} ${step.name}${latency}${message}`;
};

const checkService = (): Effect.Effect<void, unknown, RedcapService> =>
  Effect.gen(function* () {
    const service = yield* RedcapService;
    const lines: string[] = [];

    console.log(style.bold('\nRunning connectivity diagnostics...\n'));

    const result = yield* service.runDiagnostics((step) => {
      const line = formatDiagnosticStep(step);
      lines.push(line);
      console.log(line);
    });

    const statusText =
      result.overallStatus === 'ok'
        ? format.success('All checks passed')
        : result.overallStatus === 'partial'
          ? format.warn('Some checks failed')
          : format.error('Connection failed');

    p.note(`${lines.join('\n')}\n\n${statusText}`, 'Diagnostic Results');
  });

const checkHealth = (): Effect.Effect<void, unknown, RedcapService> =>
  Effect.gen(function* () {
    const service = yield* RedcapService;
    const health = yield* withSpinner('Fetching health status', service.getHealth());
    p.note(formatHealthResult(health), 'Health Status');
  });

const showProject = (): Effect.Effect<void, unknown, RedcapService> =>
  Effect.gen(function* () {
    const service = yield* RedcapService;
    const health = yield* withSpinner('Fetching project info', service.getHealth());
    p.note(formatProjectInfo(health), 'Project');
  });

const listInstruments = (): Effect.Effect<void, unknown, RedcapService> =>
  Effect.gen(function* () {
    const service = yield* RedcapService;
    const health = yield* withSpinner('Fetching instruments', service.getHealth());
    p.note(formatInstruments(health), 'Instruments');
  });

const listFields = (): Effect.Effect<void, unknown, RedcapService> =>
  Effect.gen(function* () {
    const service = yield* RedcapService;
    const health = yield* withSpinner('Fetching fields', service.getHealth());
    p.note(formatFields(health), 'Fields');
  });

const fetchRecords = (): Effect.Effect<void, unknown, RedcapService> =>
  Effect.gen(function* () {
    const service = yield* RedcapService;
    const result = yield* withSpinner('Fetching sample records', service.getRecords());

    const content =
      result.count > 0
        ? `${format.success(`Found ${String(result.count)} record(s)`)}\n\n${style.dim('First 3 records:')}\n${JSON.stringify(result.sample, null, 2)}`
        : format.warn('No records found');

    p.note(content, 'Records');
  });

const runAllTests = (): Effect.Effect<void, unknown, RedcapService> =>
  Effect.gen(function* () {
    p.note('Running comprehensive tests...', 'All Tests');

    yield* Console.log(style.bold('\n1. Service Connectivity'));
    yield* checkService().pipe(Effect.catchAll(() => Console.log(format.error('Failed'))));

    yield* Console.log(style.bold('\n2. Health Check'));
    yield* checkHealth().pipe(Effect.catchAll(() => Console.log(format.error('Failed'))));

    yield* Console.log(style.bold('\n3. Project Info'));
    yield* showProject().pipe(Effect.catchAll(() => Console.log(format.error('Failed'))));

    yield* Console.log(style.bold('\n4. Instruments'));
    yield* listInstruments().pipe(Effect.catchAll(() => Console.log(format.error('Failed'))));

    yield* Console.log(style.bold('\n5. Fields'));
    yield* listFields().pipe(Effect.catchAll(() => Console.log(format.error('Failed'))));

    yield* Console.log(style.bold('\n6. Sample Records'));
    yield* fetchRecords().pipe(Effect.catchAll(() => Console.log(format.error('Failed'))));

    p.note(format.success('All tests complete'), 'Done');
  });

// ============================================================================
// Menu Definition
// ============================================================================

type MenuAction =
  | 'service'
  | 'health'
  | 'project'
  | 'instruments'
  | 'fields'
  | 'records'
  | 'all'
  | 'exit';

const menuOptions: { value: MenuAction; label: string; hint?: string }[] = [
  { value: 'service', label: 'Check service connectivity' },
  { value: 'health', label: 'Health check', hint: 'REDCap + token' },
  { value: 'project', label: 'Show project info' },
  { value: 'instruments', label: 'List instruments' },
  { value: 'fields', label: 'List fields' },
  { value: 'records', label: 'Fetch sample records' },
  { value: 'all', label: 'Run all tests' },
  { value: 'exit', label: 'Exit', hint: 'quit the CLI' },
];

const executeAction = (action: MenuAction): Effect.Effect<void, unknown, RedcapService> => {
  switch (action) {
    case 'service': {
      return checkService();
    }
    case 'health': {
      return checkHealth();
    }
    case 'project': {
      return showProject();
    }
    case 'instruments': {
      return listInstruments();
    }
    case 'fields': {
      return listFields();
    }
    case 'records': {
      return fetchRecords();
    }
    case 'all': {
      return runAllTests();
    }
    case 'exit': {
      return Effect.void;
    }
  }
};

// ============================================================================
// Input Utilities
// ============================================================================

const waitForKey = (): Effect.Effect<void> =>
  Effect.async<void>((resume) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(pc.dim('\nPress any key to continue...'));

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.setRawMode(false);
      rl.close();
      resume(Effect.void);
    });
  });

// ============================================================================
// Menu Loop
// ============================================================================

const measureLatency = (): Effect.Effect<number | null, never, RedcapService> =>
  Effect.gen(function* () {
    const service = yield* RedcapService;
    const start = Date.now();
    const ok = yield* service.checkService().pipe(
      Effect.map(() => true),
      Effect.catchAll(() => Effect.succeed(false))
    );
    const latency = Date.now() - start;
    return ok ? latency : null;
  });

export const runInteractiveMenu = (baseUrl: string): Effect.Effect<void, never, RedcapService> =>
  Effect.gen(function* () {
    console.clear();
    p.intro(pc.bgCyan(pc.black(' 🔬 REDCap CLI ')));

    const latency = yield* measureLatency();
    const status =
      latency === null
        ? `${pc.red('●')} offline`
        : `${pc.green('●')} connected ${pc.dim(`(${String(latency)}ms)`)}`;

    p.note(`${style.cyan(baseUrl)}\n${status}`, 'Service');

    while (true) {
      const action = yield* Effect.promise(() =>
        p.select({
          message: 'What would you like to do?',
          options: menuOptions,
        })
      );

      if (p.isCancel(action) || action === 'exit') {
        p.outro(pc.dim('Goodbye!'));
        return;
      }

      yield* executeAction(action).pipe(
        Effect.catchAll((error) =>
          Effect.sync(() => p.note(format.error(`Error: ${String(error)}`), 'Error'))
        )
      );

      yield* waitForKey();
      console.clear();
      p.intro(pc.bgCyan(pc.black(' 🔬 REDCap CLI ')));
      p.note(`${style.cyan(baseUrl)}\n${status}`, 'Service');
    }
  });
/* eslint-enable functional/no-expression-statements, functional/no-conditional-statements, functional/no-loop-statements, functional/immutable-data, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition, no-console, unicorn/prefer-single-call, @typescript-eslint/no-invalid-void-type, unicorn/no-immediate-mutation */
