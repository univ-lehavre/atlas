import { Hono } from 'hono';
import { Effect, pipe } from 'effect';
import { redcap } from '../redcap.js';
import { runEffect } from '../effect-handler.js';

const project = new Hono();

/**
 * GET /project/version
 * Get REDCap version
 */
project.get('/version', (c) =>
  runEffect(
    c,
    pipe(
      redcap.getVersion(),
      Effect.map((version) => ({ version }))
    )
  )
);

/**
 * GET /project/info
 * Get project information
 */
project.get('/info', (c) => runEffect(c, redcap.getProjectInfo()));

/**
 * GET /project/instruments
 * Get all instruments
 */
project.get('/instruments', (c) => runEffect(c, redcap.getInstruments()));

/**
 * GET /project/fields
 * Get all fields (data dictionary)
 */
project.get('/fields', (c) => runEffect(c, redcap.getFields()));

/**
 * GET /project/export-field-names
 * Get export field name mappings
 */
project.get('/export-field-names', (c) => runEffect(c, redcap.getExportFieldNames()));

export { project };
