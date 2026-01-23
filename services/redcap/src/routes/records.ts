import { Hono } from 'hono';
import { Schema as S } from 'effect';
import { resolver, validator, describeRoute } from 'hono-openapi';
import { Effect, pipe } from 'effect';
import { RecordId, InstrumentName, RedcapApiError } from '@univ-lehavre/atlas-redcap-api';
import { redcap } from '../redcap.js';
import { runEffect, runEffectRaw } from '../effect-handler.js';
import { validationErrorHook } from '../middleware/validation.js';
import {
  ErrorResponseSchema,
  SuccessResponseOpenAPI,
  REDCAP_NAME_PATTERN,
  INSTRUMENT_NAME_PATTERN,
} from '../schemas.js';

/**
 * Safely parse a RecordId, returning an Effect
 * @param value - The raw string value to parse as RecordId
 * @returns An Effect that succeeds with a valid RecordId or fails with RedcapApiError
 */
const parseRecordId = (value: string): Effect.Effect<RecordId, RedcapApiError> =>
  Effect.try({
    try: () => RecordId(value),
    catch: () => new RedcapApiError({ message: `Invalid record ID: "${value}"` }),
  });

/**
 * Safely parse an InstrumentName, returning an Effect
 * @param value - The raw string value to parse as InstrumentName
 * @returns An Effect that succeeds with a valid InstrumentName or fails with RedcapApiError
 */
const parseInstrumentName = (value: string): Effect.Effect<InstrumentName, RedcapApiError> =>
  Effect.try({
    try: () => InstrumentName(value),
    catch: () => new RedcapApiError({ message: `Invalid instrument name: "${value}"` }),
  });

const records = new Hono();

// --- Schemas ---

const ExportQuerySchema = S.Struct({
  fields: S.optional(S.String.pipe(S.pattern(REDCAP_NAME_PATTERN))),
  forms: S.optional(S.String.pipe(S.pattern(REDCAP_NAME_PATTERN))),
  filterLogic: S.optional(S.String),
  rawOrLabel: S.optional(S.Literal('raw', 'label')),
}).annotations({
  identifier: 'ExportQueryParams',
  description: 'Query parameters for exporting records',
});

const ImportBodySchema = S.Struct({
  records: S.Array(
    S.Record({ key: S.String, value: S.Union(S.String, S.Number, S.Boolean, S.Null) })
  ),
  overwriteBehavior: S.optional(S.Literal('normal', 'overwrite')),
}).annotations({ identifier: 'ImportRecordsBody', description: 'Body for importing records' });

const PdfQuerySchema = S.Struct({
  instrument: S.optionalWith(S.String.pipe(S.pattern(INSTRUMENT_NAME_PATTERN)), {
    default: () => 'form',
  }),
}).annotations({ identifier: 'PdfQueryParams', description: 'Query parameters for PDF download' });

const SurveyLinkQuerySchema = S.Struct({
  instrument: S.String.pipe(S.pattern(INSTRUMENT_NAME_PATTERN)),
}).annotations({
  identifier: 'SurveyLinkQueryParams',
  description: 'Query parameters for survey link',
});

// --- Routes ---

/**
 * GET /records
 * Export records from REDCap
 */
records.get(
  '/',
  describeRoute({
    tags: ['Records'],
    summary: 'Export records',
    description: 'Export records from REDCap with optional filtering',
    responses: {
      200: {
        description: 'Records exported successfully',
        content: {
          'application/json': { schema: SuccessResponseOpenAPI },
        },
      },
      400: {
        description: 'Invalid request parameters',
        content: {
          'application/json': { schema: resolver(S.standardSchemaV1(ErrorResponseSchema)) },
        },
      },
    },
  }),
  validator('query', S.standardSchemaV1(ExportQuerySchema), validationErrorHook),
  (c) => {
    const query = c.req.valid('query');

    return runEffect(
      c,
      redcap.exportRecords({
        ...(query.fields === undefined ? {} : { fields: query.fields.split(',') }),
        ...(query.forms === undefined ? {} : { forms: query.forms.split(',') }),
        ...(query.filterLogic === undefined ? {} : { filterLogic: query.filterLogic }),
        ...(query.rawOrLabel === undefined ? {} : { rawOrLabel: query.rawOrLabel }),
        type: 'flat',
      })
    );
  }
);

/**
 * PUT /records
 * Import (upsert) records into REDCap
 */
records.put(
  '/',
  describeRoute({
    tags: ['Records'],
    summary: 'Import records',
    description: 'Import (upsert) records into REDCap',
    responses: {
      200: {
        description: 'Records imported successfully',
        content: {
          'application/json': { schema: SuccessResponseOpenAPI },
        },
      },
      400: {
        description: 'Invalid request body',
        content: {
          'application/json': { schema: resolver(S.standardSchemaV1(ErrorResponseSchema)) },
        },
      },
    },
  }),
  validator('json', S.standardSchemaV1(ImportBodySchema), validationErrorHook),
  (c) => {
    const body = c.req.valid('json');

    return runEffect(
      c,
      redcap.importRecords(
        body.records,
        body.overwriteBehavior === undefined ? {} : { overwriteBehavior: body.overwriteBehavior }
      )
    );
  }
);

/**
 * GET /records/:recordId/pdf
 * Download PDF of a form for a specific record
 */
records.get(
  '/:recordId/pdf',
  describeRoute({
    tags: ['Records'],
    summary: 'Download PDF',
    description: 'Download PDF of a form for a specific record',
    parameters: [
      {
        name: 'recordId',
        in: 'path',
        required: true,
        description: 'The unique identifier of the record',
        schema: { type: 'string', pattern: '^[a-zA-Z0-9]{20,}$', minLength: 20 },
      },
    ],
    responses: {
      200: {
        description: 'PDF file',
        content: {
          'application/pdf': { schema: { type: 'string', format: 'binary' } },
        },
      },
      400: {
        description: 'Invalid record ID or instrument',
        content: {
          'application/json': { schema: resolver(S.standardSchemaV1(ErrorResponseSchema)) },
        },
      },
    },
  }),
  validator('query', S.standardSchemaV1(PdfQuerySchema), validationErrorHook),
  (c) => {
    const rawRecordId = c.req.param('recordId');
    const rawInstrument = c.req.valid('query').instrument;

    return runEffectRaw(
      c,
      pipe(
        Effect.all([parseRecordId(rawRecordId), parseInstrumentName(rawInstrument)]),
        Effect.flatMap(([recordId, instrument]) => redcap.downloadPdf(recordId, instrument)),
        Effect.map(
          (pdfBuffer) =>
            new Response(pdfBuffer, {
              headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="record_${rawRecordId}.pdf"`,
              },
            })
        )
      )
    );
  }
);

/**
 * GET /records/:recordId/survey-link
 * Get survey link for a specific record and instrument
 */
records.get(
  '/:recordId/survey-link',
  describeRoute({
    tags: ['Records'],
    summary: 'Get survey link',
    description: 'Get survey link for a specific record and instrument',
    parameters: [
      {
        name: 'recordId',
        in: 'path',
        required: true,
        description: 'The unique identifier of the record',
        schema: { type: 'string', pattern: '^[a-zA-Z0-9]{20,}$', minLength: 20 },
      },
    ],
    responses: {
      200: {
        description: 'Survey link',
        content: {
          'application/json': { schema: SuccessResponseOpenAPI },
        },
      },
      400: {
        description: 'Invalid record ID or instrument',
        content: {
          'application/json': { schema: resolver(S.standardSchemaV1(ErrorResponseSchema)) },
        },
      },
    },
  }),
  validator('query', S.standardSchemaV1(SurveyLinkQuerySchema), validationErrorHook),
  (c) => {
    const rawRecordId = c.req.param('recordId');
    const rawInstrument = c.req.valid('query').instrument;

    return runEffect(
      c,
      pipe(
        Effect.all([parseRecordId(rawRecordId), parseInstrumentName(rawInstrument)]),
        Effect.flatMap(([recordId, instrument]) => redcap.getSurveyLink(recordId, instrument)),
        Effect.map((url) => ({ url }))
      )
    );
  }
);

export { records };
