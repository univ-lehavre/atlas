import { Hono } from 'hono';
import { Schema as S, Effect, pipe } from 'effect';
import { resolver, describeRoute, type ResponsesWithResolver } from 'hono-openapi';
import { CrfClientService } from '@univ-lehavre/atlas-crf-client';
import { runEffect } from '../effect-handler.js';
import type { CrfRuntime } from '../boot.js';
import { ErrorResponseSchema, SuccessResponseOpenAPI } from '../schemas.js';

const projectResponses = (successDescription: string): ResponsesWithResolver => ({
  200: {
    description: successDescription,
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
});

/**
 * Project routes. The handlers depend on `CrfClientService`, injected by the
 * runtime's `AppLayer` (écart E7/E10, ADR 0045) — no module-level client.
 */
// eslint-disable-next-line max-lines-per-function -- registre cohérent des routes project (version/info/instruments/fields/export-field-names) ; les découper masquerait la structure du sous-routeur
export const makeProjectRoutes = (runtime: CrfRuntime): Hono => {
  const project = new Hono();

  project.get(
    '/version',
    describeRoute({
      tags: ['Project'],
      summary: 'Get REDCap version',
      description: 'Get the version number of the REDCap instance',
      responses: projectResponses('Version retrieved successfully'),
    }),
    (c) =>
      runEffect(
        c,
        runtime,
        pipe(
          CrfClientService,
          Effect.flatMap((client) => client.getVersion()),
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
      responses: projectResponses('Project info retrieved successfully'),
    }),
    (c) =>
      runEffect(
        c,
        runtime,
        CrfClientService.pipe(Effect.flatMap((client) => client.getProjectInfo()))
      )
  );

  project.get(
    '/instruments',
    describeRoute({
      tags: ['Project'],
      summary: 'Get instruments',
      description: 'Get all instruments (forms) in the project',
      responses: projectResponses('Instruments retrieved successfully'),
    }),
    (c) =>
      runEffect(
        c,
        runtime,
        CrfClientService.pipe(Effect.flatMap((client) => client.getInstruments()))
      )
  );

  project.get(
    '/fields',
    describeRoute({
      tags: ['Project'],
      summary: 'Get fields',
      description: 'Get all fields (data dictionary) from the project',
      responses: projectResponses('Fields retrieved successfully'),
    }),
    (c) =>
      runEffect(c, runtime, CrfClientService.pipe(Effect.flatMap((client) => client.getFields())))
  );

  project.get(
    '/export-field-names',
    describeRoute({
      tags: ['Project'],
      summary: 'Get export field names',
      description: 'Get export field name mappings (useful for checkbox fields)',
      responses: projectResponses('Export field names retrieved successfully'),
    }),
    (c) =>
      runEffect(
        c,
        runtime,
        CrfClientService.pipe(Effect.flatMap((client) => client.getExportFieldNames()))
      )
  );

  return project;
};
