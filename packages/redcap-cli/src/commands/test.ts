/**
 * Test command - Tests REDCap connectivity
 */

import { Command, Options } from '@effect/cli';
import { Console, Effect, Array as Arr, pipe } from 'effect';
import { format, style, icon } from '../terminal.js';
import { RedcapService, type HealthCheck, type HealthResponse, type Field } from '../services.js';

// ============================================================================
// Options
// ============================================================================

const allOption = Options.boolean('all').pipe(
  Options.withDescription('Run all tests'),
  Options.withAlias('a')
);

const quickOption = Options.boolean('quick').pipe(
  Options.withDescription('Quick check (service + health only)'),
  Options.withAlias('q')
);

const jsonOption = Options.boolean('json').pipe(
  Options.withDescription('Output results as JSON'),
  Options.withAlias('j')
);

const serviceOption = Options.boolean('service').pipe(
  Options.withDescription('Check service connectivity'),
  Options.withAlias('s')
);

const healthOption = Options.boolean('health').pipe(
  Options.withDescription('Check REDCap server and token')
);

const projectOption = Options.boolean('project').pipe(
  Options.withDescription('Show project information'),
  Options.withAlias('p')
);

const instrumentsOption = Options.boolean('instruments').pipe(
  Options.withDescription('List available instruments'),
  Options.withAlias('i')
);

const fieldsOption = Options.boolean('fields').pipe(
  Options.withDescription('List available fields'),
  Options.withAlias('f')
);

const recordsOption = Options.boolean('records').pipe(
  Options.withDescription('Fetch sample records'),
  Options.withAlias('r')
);

// ============================================================================
// Types
// ============================================================================

interface TestFlags {
  readonly all: boolean;
  readonly quick: boolean;
  readonly service: boolean;
  readonly health: boolean;
  readonly project: boolean;
  readonly instruments: boolean;
  readonly fields: boolean;
  readonly records: boolean;
}

interface TestConfig {
  readonly all: boolean;
  readonly quick: boolean;
  readonly service: boolean;
  readonly health: boolean;
  readonly project: boolean;
  readonly instruments: boolean;
  readonly fields: boolean;
  readonly records: boolean;
  readonly json: boolean;
}

interface JsonOutput {
  success: boolean;
  timestamp: string;
  tests: {
    service?: { ok: boolean };
    health?: HealthResponse;
    project?: { version: string; name: string; id: number };
    instruments?: readonly { name: string; label: string }[];
    fields?: Record<string, readonly Field[]>;
    records?: { count: number; sample: readonly unknown[] };
  };
  error?: string;
}

interface RecordsResult {
  readonly count: number;
  readonly sample: readonly unknown[];
}

// ============================================================================
// Helpers
// ============================================================================

const getStatusIcon = (status: 'ok' | 'degraded' | 'error'): string =>
  status === 'ok' ? icon.success : status === 'degraded' ? icon.warn : icon.error;

const formatLatency = (latencyMs: number): string => {
  const latencyStyle = latencyMs > 1000 ? style.yellow : style.dim;
  return latencyStyle(`(${String(latencyMs)}ms)`);
};

const displayCheck = (name: string, check: HealthCheck): string => {
  const statusIcon = getStatusIcon(check.status);
  const latencyPart = check.latencyMs !== undefined ? ` ${formatLatency(check.latencyMs)}` : '';
  const messagePart = check.message !== undefined ? ` - ${style.dim(check.message)}` : '';
  return `${statusIcon} ${name}${latencyPart}${messagePart}`;
};

const groupFieldsByForm = (fields: readonly Field[]): Record<string, readonly Field[]> =>
  pipe(
    fields,
    Arr.groupBy((field) => field.form)
  );

// ============================================================================
// Test Options Resolution
// ============================================================================

const ALL_FLAGS: TestFlags = {
  all: true,
  quick: false,
  service: true,
  health: true,
  project: true,
  instruments: true,
  fields: true,
  records: true,
};

const QUICK_FLAGS: TestFlags = {
  all: false,
  quick: true,
  service: true,
  health: true,
  project: false,
  instruments: false,
  fields: false,
  records: false,
};

const DEFAULT_FLAGS: TestFlags = {
  all: false,
  quick: false,
  service: true,
  health: true,
  project: true,
  instruments: true,
  fields: true,
  records: true,
};

const resolveTestFlags = (config: TestConfig): TestFlags => {
  const hasSpecificFlags =
    config.service ||
    config.health ||
    config.project ||
    config.instruments ||
    config.fields ||
    config.records;

  return config.all
    ? ALL_FLAGS
    : config.quick
      ? QUICK_FLAGS
      : hasSpecificFlags
        ? {
            all: false,
            quick: false,
            service: true,
            health: config.health,
            project: config.project,
            instruments: config.instruments,
            fields: config.fields,
            records: config.records,
          }
        : DEFAULT_FLAGS;
};

// ============================================================================
// JSON Output
// ============================================================================

const createInitialOutput = (): JsonOutput => ({
  success: false,
  timestamp: new Date().toISOString(),
  tests: {},
});

const runJsonOutput = (flags: TestFlags): Effect.Effect<void, Error, RedcapService> =>
  Effect.gen(function* () {
    const service = yield* RedcapService;
    const output = createInitialOutput();

    const serviceOk = yield* service
      .checkService()
      .pipe(Effect.catchAll(() => Effect.succeed(false)));
    output.tests.service = { ok: serviceOk };

    const shouldCheckHealth = flags.health || flags.project || flags.instruments || flags.fields;

    const result = yield* serviceOk
      ? shouldCheckHealth
        ? processHealthChecks(service, flags, output)
        : processRecordsOnly(service, flags, output)
      : Effect.succeed({ output, error: 'Service not running' as const });

    result.output.success = result.error === undefined;
    result.output.error = result.error;
    yield* Console.log(JSON.stringify(result.output, null, 2));

    return result.error !== undefined ? yield* Effect.fail(new Error(result.error)) : undefined;
  });

const processHealthChecks = (
  service: RedcapService['Type'],
  flags: TestFlags,
  output: JsonOutput
): Effect.Effect<{ output: JsonOutput; error?: string }, never, never> =>
  Effect.gen(function* () {
    const health = yield* service
      .getHealth()
      .pipe(Effect.catchAll(() => Effect.succeed(null as HealthResponse | null)));

    return health !== null
      ? yield* applyHealthToOutput(service, flags, output, health)
      : { output, error: undefined };
  });

const applyHealthToOutput = (
  service: RedcapService['Type'],
  flags: TestFlags,
  output: JsonOutput,
  health: HealthResponse
): Effect.Effect<{ output: JsonOutput; error?: string }, never, never> =>
  Effect.gen(function* () {
    output.tests.health = health;

    const redcap = health.redcap;
    output.tests.project =
      flags.project && redcap !== undefined
        ? { version: redcap.version, name: redcap.project, id: redcap.projectId }
        : output.tests.project;

    output.tests.instruments =
      flags.instruments && health.instruments !== undefined
        ? health.instruments
        : output.tests.instruments;

    output.tests.fields =
      flags.fields && health.fields !== undefined
        ? groupFieldsByForm(health.fields)
        : output.tests.fields;

    return health.status === 'error'
      ? { output, error: 'Health check failed' }
      : yield* processRecordsOnly(service, flags, output);
  });

const processRecordsOnly = (
  service: RedcapService['Type'],
  flags: TestFlags,
  output: JsonOutput
): Effect.Effect<{ output: JsonOutput; error?: string }, never, never> =>
  Effect.gen(function* () {
    const records = flags.records
      ? yield* service
          .getRecords()
          .pipe(Effect.catchAll(() => Effect.succeed(null as RecordsResult | null)))
      : null;

    output.tests.records = records ?? output.tests.records;
    return { output, error: undefined };
  });

// ============================================================================
// Normal Output
// ============================================================================

const runNormalOutput = (flags: TestFlags): Effect.Effect<void, Error, RedcapService> =>
  Effect.gen(function* () {
    const service = yield* RedcapService;

    yield* Console.log(format.title('🔬 REDCap Connection Test'));
    yield* Console.log(format.title('1. Service Status'));
    yield* Console.log(format.step('Checking service...'));

    const serviceOk = yield* service
      .checkService()
      .pipe(Effect.catchAll(() => Effect.succeed(false)));

    yield* serviceOk
      ? Effect.void
      : Effect.zipRight(
          Console.log(format.error('Service is not running')),
          Effect.fail(new Error('Service not running'))
        );

    yield* Console.log(format.success('Service is running'));

    const shouldCheckHealth = flags.health || flags.project || flags.instruments || flags.fields;
    const health = shouldCheckHealth ? yield* fetchAndDisplayHealth(service) : null;

    yield* displayProjectInfo(flags, health);
    yield* displayInstruments(flags, health);
    yield* displayFields(flags, health);
    yield* displayRecords(service, flags);

    yield* Console.log(format.title('✅ All checks passed!'));
  });

const fetchAndDisplayHealth = (
  service: RedcapService['Type']
): Effect.Effect<HealthResponse | null, Error, never> =>
  Effect.gen(function* () {
    yield* Console.log(format.title('2. Health Checks'));
    yield* Console.log(format.step('Fetching detailed health status...'));

    const health = yield* service
      .getHealth()
      .pipe(Effect.catchAll(() => Effect.succeed(null as HealthResponse | null)));

    yield* health === null
      ? Effect.zipRight(
          Console.log(format.error('Failed to retrieve health status')),
          Effect.fail(new Error('Health check failed'))
        )
      : Effect.void;

    yield* health !== null ? displayHealthChecks(health) : Effect.void;

    return health;
  });

const displayHealthChecks = (health: HealthResponse): Effect.Effect<void, Error, never> =>
  Effect.gen(function* () {
    yield* Console.log(displayCheck('REDCap Server', health.checks.redcap));
    yield* Console.log(displayCheck('API Token', health.checks.token));
    yield* health.checks.internet !== undefined
      ? Console.log(displayCheck('Internet', health.checks.internet))
      : Effect.void;

    yield* health.status === 'error' ? handleHealthError(health) : Effect.void;
    yield* health.status === 'degraded'
      ? Console.log(format.warn('Health checks passed with warnings'))
      : Effect.void;
  });

const handleHealthError = (health: HealthResponse): Effect.Effect<never, Error, never> =>
  Effect.gen(function* () {
    yield* Console.log(format.title('❌ Health checks failed'));

    yield* health.checks.redcap.status === 'error' ? displayRedcapError(health) : Effect.void;
    yield* health.checks.token.status === 'error' ? displayTokenError() : Effect.void;

    return yield* Effect.fail(new Error('Health check failed'));
  });

const displayRedcapError = (health: HealthResponse): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    yield* Console.log(format.error('Cannot reach REDCap server'));
    const message =
      health.checks.internet?.status === 'error'
        ? '→ No internet connectivity detected'
        : '→ Check REDCAP_API_URL in your configuration';
    yield* Console.log(format.info(message));
  });

const displayTokenError = (): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    yield* Console.log(format.error('Invalid API token'));
    yield* Console.log(format.info('→ Check REDCAP_API_TOKEN in your configuration'));
  });

const displayProjectInfo = (
  flags: TestFlags,
  health: HealthResponse | null
): Effect.Effect<void, never, never> => {
  const redcap = health?.redcap;
  return flags.project && redcap !== undefined
    ? Effect.gen(function* () {
        yield* Console.log(format.title('3. Project Information'));
        yield* Console.log(format.success(`REDCap version: ${redcap.version}`));
        yield* Console.log(format.success(`Project: "${redcap.project}"`));
        yield* Console.log(format.info(`Project ID: ${String(redcap.projectId)}`));
      })
    : Effect.void;
};

const displayInstruments = (
  flags: TestFlags,
  health: HealthResponse | null
): Effect.Effect<void, never, never> => {
  const instruments = health?.instruments;
  return flags.instruments && instruments !== undefined && instruments.length > 0
    ? Effect.gen(function* () {
        yield* Console.log(format.title('4. Available Instruments (Forms)'));
        yield* Effect.forEach(instruments, (instrument) =>
          Console.log(
            `  ${style.cyan('•')} ${style.bold(instrument.name)} - ${style.dim(instrument.label)}`
          )
        );
      })
    : Effect.void;
};

const displayFields = (
  flags: TestFlags,
  health: HealthResponse | null
): Effect.Effect<void, never, never> => {
  const fields = health?.fields;
  return flags.fields && fields !== undefined && fields.length > 0
    ? Effect.gen(function* () {
        yield* Console.log(format.title('5. Available Fields'));
        const fieldsByForm = groupFieldsByForm(fields);

        yield* Effect.forEach(Object.entries(fieldsByForm), ([formName, formFields]) =>
          displayFormFields(formName, formFields)
        );
      })
    : Effect.void;
};

const displayFormFields = (
  formName: string,
  fields: readonly Field[]
): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    yield* Console.log(`\n  ${style.bold(formName)}:`);
    const displayedFields = fields.slice(0, 10);
    yield* Effect.forEach(displayedFields, (field) => {
      const typeLabel = `[${field.type}]`;
      return Console.log(`    ${style.dim(typeLabel.padEnd(12))} ${field.name}`);
    });
    yield* fields.length > 10
      ? Console.log(`    ${style.dim(`... and ${String(fields.length - 10)} more fields`)}`)
      : Effect.void;
  });

const displayRecords = (
  service: RedcapService['Type'],
  flags: TestFlags
): Effect.Effect<void, never, never> =>
  flags.records
    ? Effect.gen(function* () {
        yield* Console.log(format.title('6. Sample Records'));
        yield* Console.log(format.step('Fetching sample records...'));

        const records = yield* service
          .getRecords()
          .pipe(Effect.catchAll(() => Effect.succeed(null as RecordsResult | null)));

        yield* records !== null
          ? displayRecordResults(records)
          : Console.log(format.warn('Could not fetch records'));
      })
    : Effect.void;

const displayRecordResults = (records: RecordsResult): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    yield* Console.log(format.success(`Found ${String(records.count)} record(s)`));
    yield* records.count > 0
      ? Effect.zipRight(
          Console.log(`\n${style.dim('First 3 records:')}`),
          Console.log(JSON.stringify(records.sample, null, 2))
        )
      : Effect.void;
  });

// ============================================================================
// Command
// ============================================================================

export const testCommand = Command.make(
  'test',
  {
    all: allOption,
    quick: quickOption,
    json: jsonOption,
    service: serviceOption,
    health: healthOption,
    project: projectOption,
    instruments: instrumentsOption,
    fields: fieldsOption,
    records: recordsOption,
  },
  (config) => {
    const flags = resolveTestFlags(config);
    return config.json
      ? runJsonOutput(flags).pipe(Effect.catchAll((error) => Effect.fail(error)))
      : runNormalOutput(flags).pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Console.error(format.error(`Error: ${String(error)}`));
              return yield* Effect.fail(error);
            })
          )
        );
  }
);
