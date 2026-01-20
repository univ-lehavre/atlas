import { Hono } from 'hono';
import { Schema as S } from 'effect';
import { effectValidator } from '@hono/effect-validator';
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

/**
 * GET /records
 * Export records from REDCap
 */
const ExportQuerySchema = S.Struct({
  fields: S.optional(S.String),
  forms: S.optional(S.String),
  filterLogic: S.optional(S.String),
  rawOrLabel: S.optional(S.Literal('raw', 'label')),
});

records.get('/', effectValidator('query', ExportQuerySchema), (c) => {
  const query = c.req.valid('query');

  return runEffect(
    c,
    redcap.exportRecords({
      ...(query.fields !== undefined ? { fields: query.fields.split(',') } : {}),
      ...(query.forms !== undefined ? { forms: query.forms.split(',') } : {}),
      ...(query.filterLogic !== undefined ? { filterLogic: query.filterLogic } : {}),
      ...(query.rawOrLabel !== undefined ? { rawOrLabel: query.rawOrLabel } : {}),
      type: 'flat',
    })
  );
});

/**
 * POST /records
 * Import records into REDCap
 */
const ImportBodySchema = S.Struct({
  records: S.Array(S.Record({ key: S.String, value: S.Unknown })),
  overwriteBehavior: S.optional(S.Literal('normal', 'overwrite')),
});

records.post('/', effectValidator('json', ImportBodySchema), (c) => {
  const body = c.req.valid('json');

  return runEffect(
    c,
    redcap.importRecords(
      body.records,
      body.overwriteBehavior !== undefined ? { overwriteBehavior: body.overwriteBehavior } : {}
    )
  );
});

/**
 * GET /records/:recordId/pdf
 * Download PDF of a form for a specific record
 */
const PdfQuerySchema = S.Struct({
  instrument: S.optionalWith(S.String, { default: () => 'form' }),
});

records.get('/:recordId/pdf', effectValidator('query', PdfQuerySchema), (c) => {
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
});

/**
 * GET /records/:recordId/survey-link
 * Get survey link for a specific record and instrument
 */
const SurveyLinkQuerySchema = S.Struct({
  instrument: S.String,
});

records.get('/:recordId/survey-link', effectValidator('query', SurveyLinkQuerySchema), (c) => {
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
});

export { records };
