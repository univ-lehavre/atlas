/**
 * Interactive menu for REDCap CLI
 */

import * as readline from 'node:readline';
import { Effect, Console } from 'effect';
import { style, format, icon } from './terminal.js';
import { RedcapService, type HealthResponse, type Field } from './services.js';

// ============================================================================
// Menu Items
// ============================================================================

interface MenuItem {
  readonly key: string;
  readonly label: string;
  readonly action: () => Effect.Effect<void, unknown, RedcapService>;
}

// ============================================================================
// Input Utilities
// ============================================================================

const waitForKey = (): Effect.Effect<void, never, never> =>
  Effect.async<void>((resume) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(style.dim('\nPress any key to continue...'));

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.setRawMode(false);
      rl.close();
      resume(Effect.void);
    });
  });

const readChoice = (): Effect.Effect<string, never, never> =>
  Effect.async<string>((resume) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(style.cyan('\n> '), (answer) => {
      rl.close();
      resume(Effect.succeed(answer.trim()));
    });
  });

const clearScreen = (): Effect.Effect<void, never, never> =>
  Effect.sync(() => {
    console.clear();
  });

// ============================================================================
// Display Helpers
// ============================================================================

const groupFieldsByForm = (fields: readonly Field[]): Record<string, readonly Field[]> => {
  const result: Record<string, Field[]> = {};
  for (const field of fields) {
    const existing = result[field.form];
    result[field.form] = existing !== undefined ? [...existing, field] : [field];
  }
  return result;
};

const displayHealthResult = (health: HealthResponse): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    const statusIcon =
      health.status === 'ok' ? icon.success : health.status === 'degraded' ? icon.warn : icon.error;

    yield* Console.log(`\n${statusIcon} Overall status: ${style.bold(health.status)}`);
    yield* Console.log(`  Timestamp: ${style.dim(health.timestamp)}`);

    yield* Console.log('\nChecks:');
    yield* Console.log(
      `  ${health.checks.redcap.status === 'ok' ? icon.success : icon.error} REDCap Server` +
        (health.checks.redcap.latencyMs !== undefined
          ? ` ${style.dim(`(${String(health.checks.redcap.latencyMs)}ms)`)}`
          : '')
    );
    yield* Console.log(
      `  ${health.checks.token.status === 'ok' ? icon.success : icon.error} API Token`
    );

    if (health.checks.internet !== undefined) {
      yield* Console.log(
        `  ${health.checks.internet.status === 'ok' ? icon.success : icon.error} Internet`
      );
    }
  });

const displayProjectInfo = (health: HealthResponse): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    const redcap = health.redcap;
    if (redcap === undefined) {
      yield* Console.log(format.warn('Project info not available'));
      return;
    }

    yield* Console.log(`\n${style.bold('Project Information')}`);
    yield* Console.log(`  Version:    ${style.cyan(redcap.version)}`);
    yield* Console.log(`  Project:    ${style.cyan(redcap.project)}`);
    yield* Console.log(`  Project ID: ${style.cyan(String(redcap.projectId))}`);
  });

const displayInstruments = (health: HealthResponse): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    const instruments = health.instruments;
    if (instruments === undefined || instruments.length === 0) {
      yield* Console.log(format.warn('No instruments available'));
      return;
    }

    yield* Console.log(`\n${style.bold('Instruments')} (${String(instruments.length)})`);
    for (const instrument of instruments) {
      yield* Console.log(
        `  ${style.cyan('•')} ${instrument.name} - ${style.dim(instrument.label)}`
      );
    }
  });

const displayFields = (health: HealthResponse): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    const fields = health.fields;
    if (fields === undefined || fields.length === 0) {
      yield* Console.log(format.warn('No fields available'));
      return;
    }

    yield* Console.log(`\n${style.bold('Fields')} (${String(fields.length)} total)`);
    const byForm = groupFieldsByForm(fields);

    for (const [formName, formFields] of Object.entries(byForm)) {
      yield* Console.log(`\n  ${style.bold(formName)}:`);
      const displayed = formFields.slice(0, 5);
      for (const field of displayed) {
        yield* Console.log(`    ${style.dim(`[${field.type}]`.padEnd(12))} ${field.name}`);
      }
      if (formFields.length > 5) {
        yield* Console.log(`    ${style.dim(`... and ${String(formFields.length - 5)} more`)}`);
      }
    }
  });

// ============================================================================
// Menu Actions
// ============================================================================

const checkService = (): Effect.Effect<void, unknown, RedcapService> =>
  Effect.gen(function* () {
    yield* Console.log(format.step('Checking service connectivity...'));
    const service = yield* RedcapService;
    const ok = yield* service.checkService();

    yield* ok
      ? Console.log(format.success('Service is running'))
      : Console.log(format.error('Service is not reachable'));
  });

const checkHealth = (): Effect.Effect<void, unknown, RedcapService> =>
  Effect.gen(function* () {
    yield* Console.log(format.step('Fetching health status...'));
    const service = yield* RedcapService;
    const health = yield* service.getHealth();
    yield* displayHealthResult(health);
  });

const showProject = (): Effect.Effect<void, unknown, RedcapService> =>
  Effect.gen(function* () {
    yield* Console.log(format.step('Fetching project info...'));
    const service = yield* RedcapService;
    const health = yield* service.getHealth();
    yield* displayProjectInfo(health);
  });

const listInstruments = (): Effect.Effect<void, unknown, RedcapService> =>
  Effect.gen(function* () {
    yield* Console.log(format.step('Fetching instruments...'));
    const service = yield* RedcapService;
    const health = yield* service.getHealth();
    yield* displayInstruments(health);
  });

const listFields = (): Effect.Effect<void, unknown, RedcapService> =>
  Effect.gen(function* () {
    yield* Console.log(format.step('Fetching fields...'));
    const service = yield* RedcapService;
    const health = yield* service.getHealth();
    yield* displayFields(health);
  });

const fetchRecords = (): Effect.Effect<void, unknown, RedcapService> =>
  Effect.gen(function* () {
    yield* Console.log(format.step('Fetching sample records...'));
    const service = yield* RedcapService;
    const result = yield* service.getRecords();

    yield* Console.log(format.success(`Found ${String(result.count)} record(s)`));
    if (result.count > 0) {
      yield* Console.log(`\n${style.dim('First 3 records:')}`);
      yield* Console.log(JSON.stringify(result.sample, null, 2));
    }
  });

const runAllTests = (): Effect.Effect<void, unknown, RedcapService> =>
  Effect.gen(function* () {
    yield* Console.log(style.bold('\n=== Running All Tests ===\n'));

    yield* Console.log(style.bold('1. Service Connectivity'));
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

    yield* Console.log(style.bold('\n=== All Tests Complete ==='));
  });

// ============================================================================
// Menu Definition
// ============================================================================

const menuItems: readonly MenuItem[] = [
  { key: '1', label: 'Check service connectivity', action: checkService },
  { key: '2', label: 'Health check (REDCap + token)', action: checkHealth },
  { key: '3', label: 'Show project info', action: showProject },
  { key: '4', label: 'List instruments', action: listInstruments },
  { key: '5', label: 'List fields', action: listFields },
  { key: '6', label: 'Fetch sample records', action: fetchRecords },
  { key: '7', label: 'Run all tests', action: runAllTests },
];

// ============================================================================
// Menu Display
// ============================================================================

const displayMenu = (baseUrl: string): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    yield* Console.log(style.bold('\n🔬 REDCap CLI\n'));
    yield* Console.log(`Service URL: ${style.cyan(baseUrl)}\n`);

    for (const item of menuItems) {
      yield* Console.log(`  ${style.cyan(item.key)}. ${item.label}`);
    }
    yield* Console.log(`  ${style.cyan('0')}. Exit`);
  });

// ============================================================================
// Menu Loop
// ============================================================================

export const runInteractiveMenu = (baseUrl: string): Effect.Effect<void, never, RedcapService> =>
  Effect.gen(function* () {
    let running = true;

    while (running) {
      yield* clearScreen();
      yield* displayMenu(baseUrl);

      const choice = yield* readChoice();

      if (choice === '0') {
        running = false;
        yield* Console.log(format.info('Goodbye!'));
        continue;
      }

      const item = menuItems.find((m) => m.key === choice);

      if (item === undefined) {
        yield* Console.log(format.warn('Invalid choice'));
        yield* waitForKey();
        continue;
      }

      yield* clearScreen();
      yield* Console.log(style.bold(`\n${item.label}\n`));

      yield* item
        .action()
        .pipe(Effect.catchAll((error) => Console.log(format.error(`Error: ${String(error)}`))));

      yield* waitForKey();
    }
  });
