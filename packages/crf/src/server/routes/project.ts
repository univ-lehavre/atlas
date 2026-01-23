import { Hono } from 'hono';
import { Schema as S, Effect, pipe } from 'effect';
import { resolver, describeRoute } from 'hono-openapi';
import { redcap } from '../redcap.js';
import { runEffect } from '../effect-handler.js';
import { ErrorResponseSchema, SuccessResponseOpenAPI } from '../schemas.js';

const project = new Hono();

project.get(
  '/version',
  describeRoute({
    tags: ['Project'],
    summary: 'Get REDCap version',
    description: 'Get the version number of the REDCap instance',
    responses: {
      200: {
        description: 'Version retrieved successfully',
        content: {
          'application/json': { schema: SuccessResponseOpenAPI },
        },
      },
      503: {
        description: 'REDCap server unavailable',
        content: {
          'application/json': { schema: resolver(S.standardSchemaV1(ErrorResponseSchema)) },
        },
      },
    },
  }),
  (c) =>
    runEffect(
      c,
      pipe(
        redcap.getVersion(),
        Effect.map((version) => ({ version }))
      )
    )
);

project.get(
  '/info',
  describeRoute({
    tags: ['Project'],
    summary: 'Get project information',
    description: 'Get information about the REDCap project',
    responses: {
      200: {
        description: 'Project info retrieved successfully',
        content: {
          'application/json': { schema: SuccessResponseOpenAPI },
        },
      },
      503: {
        description: 'REDCap server unavailable',
        content: {
          'application/json': { schema: resolver(S.standardSchemaV1(ErrorResponseSchema)) },
        },
      },
    },
  }),
  (c) => runEffect(c, redcap.getProjectInfo())
);

project.get(
  '/instruments',
  describeRoute({
    tags: ['Project'],
    summary: 'Get instruments',
    description: 'Get all instruments (forms) in the project',
    responses: {
      200: {
        description: 'Instruments retrieved successfully',
        content: {
          'application/json': { schema: SuccessResponseOpenAPI },
        },
      },
      503: {
        description: 'REDCap server unavailable',
        content: {
          'application/json': { schema: resolver(S.standardSchemaV1(ErrorResponseSchema)) },
        },
      },
    },
  }),
  (c) => runEffect(c, redcap.getInstruments())
);

project.get(
  '/fields',
  describeRoute({
    tags: ['Project'],
    summary: 'Get fields',
    description: 'Get all fields (data dictionary) from the project',
    responses: {
      200: {
        description: 'Fields retrieved successfully',
        content: {
          'application/json': { schema: SuccessResponseOpenAPI },
        },
      },
      503: {
        description: 'REDCap server unavailable',
        content: {
          'application/json': { schema: resolver(S.standardSchemaV1(ErrorResponseSchema)) },
        },
      },
    },
  }),
  (c) => runEffect(c, redcap.getFields())
);

project.get(
  '/export-field-names',
  describeRoute({
    tags: ['Project'],
    summary: 'Get export field names',
    description: 'Get export field name mappings (useful for checkbox fields)',
    responses: {
      200: {
        description: 'Export field names retrieved successfully',
        content: {
          'application/json': { schema: SuccessResponseOpenAPI },
        },
      },
      503: {
        description: 'REDCap server unavailable',
        content: {
          'application/json': { schema: resolver(S.standardSchemaV1(ErrorResponseSchema)) },
        },
      },
    },
  }),
  (c) => runEffect(c, redcap.getExportFieldNames())
);

export { project };
