import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Effect, pipe } from 'effect';
import { redcap } from '../redcap.js';
import { runEffect, runEffectRaw } from '../effect-handler.js';

const records = new Hono();

/**
 * GET /records
 * Export records from REDCap
 */
const exportQuerySchema = z.object({
  fields: z.string().optional(),
  forms: z.string().optional(),
  filterLogic: z.string().optional(),
  rawOrLabel: z.enum(['raw', 'label']).optional(),
});

records.get('/', zValidator('query', exportQuerySchema), (c) => {
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
const importBodySchema = z.object({
  records: z.array(z.record(z.string(), z.unknown())),
  overwriteBehavior: z.enum(['normal', 'overwrite']).optional(),
});

records.post('/', zValidator('json', importBodySchema), (c) => {
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
const pdfQuerySchema = z.object({
  instrument: z.string().default('form'),
});

records.get('/:recordId/pdf', zValidator('query', pdfQuerySchema), (c) => {
  const recordId = c.req.param('recordId');
  const { instrument } = c.req.valid('query');

  return runEffectRaw(
    c,
    pipe(
      redcap.downloadPdf(recordId, instrument),
      Effect.map(
        (pdfBuffer) =>
          new Response(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="record_${recordId}.pdf"`,
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
const surveyLinkQuerySchema = z.object({
  instrument: z.string(),
});

records.get('/:recordId/survey-link', zValidator('query', surveyLinkQuerySchema), (c) => {
  const recordId = c.req.param('recordId');
  const { instrument } = c.req.valid('query');

  return runEffect(
    c,
    pipe(
      redcap.getSurveyLink(recordId, instrument),
      Effect.map((url) => ({ url }))
    )
  );
});

export { records };
