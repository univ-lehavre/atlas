import { Hono } from 'hono';
import { Schema as S } from 'effect';
import { resolver, validator as effectValidator, describeRoute } from 'hono-openapi';
import { Effect, pipe } from 'effect';
import { RecordId, InstrumentName, RedcapApiError } from '@univ-lehavre/atlas-redcap-api';
import { redcap } from '../redcap.js';
import { runEffect, runEffectRaw } from '../effect-handler.js';

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
  fields: S.optional(S.String),
  forms: S.optional(S.String),
  filterLogic: S.optional(S.String),
  rawOrLabel: S.optional(S.Literal('raw', 'label')),
}).annotations({
  identifier: 'ExportQueryParams',
  description: 'Query parameters for exporting records',
});

const ImportBodySchema = S.Struct({
  records: S.Array(S.Record({ key: S.String, value: S.Unknown })),
  overwriteBehavior: S.optional(S.Literal('normal', 'overwrite')),
}).annotations({ identifier: 'ImportRecordsBody', description: 'Body for importing records' });

const PdfQuerySchema = S.Struct({
  instrument: S.optionalWith(S.String, { default: () => 'form' }),
}).annotations({ identifier: 'PdfQueryParams', description: 'Query parameters for PDF download' });

const SurveyLinkQuerySchema = S.Struct({
  instrument: S.String,
}).annotations({
  identifier: 'SurveyLinkQueryParams',
  description: 'Query parameters for survey link',
});

const SuccessResponseSchema = S.Struct({
  data: S.Unknown,
}).annotations({ identifier: 'SuccessResponse', description: 'Successful API response' });

const ErrorResponseSchema = S.Struct({
  data: S.Null,
  error: S.Struct({
    code: S.String,
    message: S.String,
  }),
}).annotations({ identifier: 'ErrorResponse', description: 'Error API response' });

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
          'application/json': { schema: resolver(S.standardSchemaV1(SuccessResponseSchema)) },
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
  effectValidator('query', S.standardSchemaV1(ExportQuerySchema)),
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
          'application/json': { schema: resolver(S.standardSchemaV1(SuccessResponseSchema)) },
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
  effectValidator('json', S.standardSchemaV1(ImportBodySchema)),
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
  effectValidator('query', S.standardSchemaV1(PdfQuerySchema)),
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
    responses: {
      200: {
        description: 'Survey link',
        content: {
          'application/json': { schema: resolver(S.standardSchemaV1(SuccessResponseSchema)) },
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
  effectValidator('query', S.standardSchemaV1(SurveyLinkQuerySchema)),
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
