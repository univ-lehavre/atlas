/**
 * Service layer for REDCap CLI operations
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
// Schemas
// ============================================================================

const HealthCheckSchema = Schema.Struct({
  name: Schema.String,
  status: Schema.Literal('ok', 'degraded', 'error'),
  latencyMs: Schema.optional(Schema.Number),
  message: Schema.optional(Schema.String),
});

const InstrumentSchema = Schema.Struct({
  name: Schema.String,
  label: Schema.String,
});

const FieldSchema = Schema.Struct({
  name: Schema.String,
  form: Schema.String,
  type: Schema.String,
  label: Schema.String,
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

export type HealthCheck = Schema.Schema.Type<typeof HealthCheckSchema>;
export type HealthResponse = Schema.Schema.Type<typeof HealthResponseSchema>;
export type Instrument = Schema.Schema.Type<typeof InstrumentSchema>;
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

export const RedcapServiceLive = Layer.effect(
  RedcapService,
  Effect.gen(function* () {
    const config = yield* RedcapServiceConfigTag;
    const client = yield* HttpClient.HttpClient;

    return {
      checkService: makeCheckService(client, config.baseUrl),
      getHealth: makeGetHealth(client, config.baseUrl),
      getRecords: makeGetRecords(client, config.baseUrl),
    };
  })
);
