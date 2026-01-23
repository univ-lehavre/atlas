/* eslint-disable functional/no-let, functional/no-expression-statements, functional/no-conditional-statements, functional/no-try-statements, functional/no-loop-statements -- SSE parsing requires imperative code */
/**
 * Service layer for REDCap CLI operations
 * Calls the REDCap service HTTP endpoints only
 */

import { HttpClient, HttpClientRequest, HttpClientResponse } from '@effect/platform';
import { Context, Data, Effect, Layer, Schema } from 'effect';

// ============================================================================
// Errors
// ============================================================================

export class RedcapCliError extends Data.TaggedError('RedcapCliError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ============================================================================
// Diagnostic Types (matching atlas-net)
// ============================================================================

export type DiagnosticStatus = 'ok' | 'error' | 'skipped';

export interface DiagnosticStep {
  readonly name: string;
  readonly status: DiagnosticStatus;
  readonly latencyMs?: number;
  readonly message?: string;
}

export interface DiagnosticResult {
  readonly steps: readonly DiagnosticStep[];
  readonly overallStatus: 'ok' | 'partial' | 'error';
}

// ============================================================================
// Schemas
// ============================================================================

const HealthCheckSchema = Schema.Struct({
  name: Schema.String,
  status: Schema.Literal('ok', 'degraded', 'error'),
  latencyMs: Schema.optional(Schema.Number),
  message: Schema.optional(Schema.String),
});

// Use schemas aligned with redcap-api types
const InstrumentSchema = Schema.Struct({
  instrument_name: Schema.String,
  instrument_label: Schema.String,
});

const FieldSchema = Schema.Struct({
  field_name: Schema.String,
  form_name: Schema.String,
  field_type: Schema.String,
  field_label: Schema.String,
});

const HealthResponseSchema = Schema.Struct({
  status: Schema.Literal('ok', 'degraded', 'error'),
  timestamp: Schema.String,
  checks: Schema.Struct({
    redcap: HealthCheckSchema,
    token: HealthCheckSchema,
    internet: Schema.optional(HealthCheckSchema),
  }),
  redcap: Schema.optional(
    Schema.Struct({
      version: Schema.String,
      project: Schema.String,
      projectId: Schema.Number,
    })
  ),
  instruments: Schema.optional(Schema.Array(InstrumentSchema)),
  fields: Schema.optional(Schema.Array(FieldSchema)),
});

const RecordsResponseSchema = Schema.Struct({
  data: Schema.Array(Schema.Unknown),
});

const DiagnosticStepSchema = Schema.Struct({
  name: Schema.String,
  status: Schema.Literal('ok', 'error', 'skipped'),
  latencyMs: Schema.optional(Schema.Number),
  message: Schema.optional(Schema.String),
});

const DiagnosticResultSchema = Schema.Struct({
  steps: Schema.Array(DiagnosticStepSchema),
  overallStatus: Schema.Literal('ok', 'partial', 'error'),
});

export type HealthResponse = Schema.Schema.Type<typeof HealthResponseSchema>;
export type Field = Schema.Schema.Type<typeof FieldSchema>;

// ============================================================================
// Configuration
// ============================================================================

export interface RedcapServiceConfig {
  readonly baseUrl: string;
}

export class RedcapServiceConfigTag extends Context.Tag('RedcapServiceConfig')<
  RedcapServiceConfigTag,
  RedcapServiceConfig
>() {}

// ============================================================================
// Service
// ============================================================================

interface RecordsResult {
  readonly count: number;
  readonly sample: readonly unknown[];
}

export class RedcapService extends Context.Tag('RedcapService')<
  RedcapService,
  {
    readonly checkService: () => Effect.Effect<boolean, RedcapCliError>;
    readonly getHealth: () => Effect.Effect<HealthResponse, RedcapCliError>;
    readonly getRecords: () => Effect.Effect<RecordsResult, RedcapCliError>;
    readonly runDiagnostics: (
      onStep: (step: DiagnosticStep) => void
    ) => Effect.Effect<DiagnosticResult, RedcapCliError>;
  }
>() {}

const makeCheckService =
  (client: HttpClient.HttpClient, baseUrl: string) => (): Effect.Effect<boolean, RedcapCliError> =>
    Effect.gen(function* () {
      const request = HttpClientRequest.get(`${baseUrl}/health`);
      const response = yield* client.execute(request).pipe(
        Effect.timeout('3 seconds'),
        Effect.mapError(
          (error) =>
            new RedcapCliError({
              message: `Cannot connect to service: ${String(error)}`,
              cause: error,
            })
        )
      );
      return response.status === 200;
    });

const makeGetHealth =
  (client: HttpClient.HttpClient, baseUrl: string) =>
  (): Effect.Effect<HealthResponse, RedcapCliError> =>
    Effect.gen(function* () {
      const request = HttpClientRequest.get(`${baseUrl}/health/detailed`);
      const response = yield* client.execute(request).pipe(
        Effect.mapError(
          (error) =>
            new RedcapCliError({
              message: `Failed to get health status: ${String(error)}`,
              cause: error,
            })
        )
      );
      return yield* HttpClientResponse.schemaBodyJson(HealthResponseSchema)(response).pipe(
        Effect.mapError(
          (error) =>
            new RedcapCliError({
              message: `Invalid health response: ${String(error)}`,
              cause: error,
            })
        )
      );
    });

const makeGetRecords =
  (client: HttpClient.HttpClient, baseUrl: string) =>
  (): Effect.Effect<RecordsResult, RedcapCliError> =>
    Effect.gen(function* () {
      const request = HttpClientRequest.get(`${baseUrl}/api/v1/records`);
      const response = yield* client.execute(request).pipe(
        Effect.mapError(
          (error) =>
            new RedcapCliError({
              message: `Failed to fetch records: ${String(error)}`,
              cause: error,
            })
        )
      );
      const json = yield* HttpClientResponse.schemaBodyJson(RecordsResponseSchema)(response).pipe(
        Effect.mapError(
          (error) =>
            new RedcapCliError({
              message: `Invalid records response: ${String(error)}`,
              cause: error,
            })
        )
      );
      return {
        count: json.data.length,
        sample: json.data.slice(0, 3),
      };
    });

// ============================================================================
// Diagnostic Runner (SSE client)
// ============================================================================

const makeRunDiagnostics =
  (client: HttpClient.HttpClient, baseUrl: string) =>
  (onStep: (step: DiagnosticStep) => void): Effect.Effect<DiagnosticResult, RedcapCliError> =>
    Effect.gen(function* () {
      const request = HttpClientRequest.get(`${baseUrl}/health/diagnose`);
      const response = yield* client.execute(request).pipe(
        Effect.mapError(
          (error) =>
            new RedcapCliError({
              message: `Failed to run diagnostics: ${String(error)}`,
              cause: error,
            })
        )
      );

      // Parse SSE stream
      const text = yield* response.text.pipe(
        Effect.mapError(
          (error) =>
            new RedcapCliError({
              message: `Failed to read diagnostics response: ${String(error)}`,
              cause: error,
            })
        )
      );

      // Parse SSE events from text
      const lines = text.split('\n');
      let result: DiagnosticResult = { steps: [], overallStatus: 'error' };

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          try {
            const parsed = JSON.parse(data) as unknown;

            // Check if it's a complete result (has overallStatus)
            if (typeof parsed === 'object' && parsed !== null && 'overallStatus' in parsed) {
              result = Schema.decodeUnknownSync(DiagnosticResultSchema)(parsed);
            } else {
              // It's a step
              const step = Schema.decodeUnknownSync(DiagnosticStepSchema)(parsed);
              onStep(step);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      return result;
    });

export const RedcapServiceLive = Layer.effect(
  RedcapService,
  Effect.gen(function* () {
    const config = yield* RedcapServiceConfigTag;
    const client = yield* HttpClient.HttpClient;

    return {
      checkService: makeCheckService(client, config.baseUrl),
      getHealth: makeGetHealth(client, config.baseUrl),
      getRecords: makeGetRecords(client, config.baseUrl),
      runDiagnostics: makeRunDiagnostics(client, config.baseUrl),
    };
  })
);
/* eslint-enable functional/no-let, functional/no-expression-statements, functional/no-conditional-statements, functional/no-try-statements, functional/no-loop-statements */
