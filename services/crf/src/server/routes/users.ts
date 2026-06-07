import { Hono } from 'hono';
import { Schema as S } from 'effect';
import { resolver, validator, describeRoute } from 'hono-openapi';
import { Effect, pipe } from 'effect';
import { CrfApiError, CrfClientService } from '@univ-lehavre/atlas-crf-client';
import { runEffect } from '../effect-handler.js';
import type { CrfRuntime } from '../boot.js';
import { validationErrorHook } from '../middleware/validation.js';
import { ErrorResponseSchema, EMAIL_PATTERN } from '../schemas.js';

const Email = S.String.pipe(S.pattern(EMAIL_PATTERN), S.brand('Email'));

const ByEmailQuerySchema = S.Struct({
  email: Email,
}).annotations({
  identifier: 'ByEmailQueryParams',
  description: 'Query parameters for finding user by email',
});

const UserResponseSchema = S.Struct({
  data: S.Struct({
    userId: S.String,
  }),
}).annotations({ identifier: 'UserResponse', description: 'User found response' });

/**
 * Users routes. Handlers depend on `CrfClientService`, injected by the
 * runtime's `AppLayer` (écart E7/E10, ADR 0045).
 */
export const makeUsersRoutes = (runtime: CrfRuntime): Hono => {
  const users = new Hono();

  users.get(
    '/by-email',
    describeRoute({
      tags: ['Users'],
      summary: 'Find user by email',
      description: 'Find a user by email address in REDCap',
      responses: {
        200: {
          description: 'User found',
          content: {
            'application/json': { schema: resolver(S.standardSchemaV1(UserResponseSchema)) },
          },
        },
        400: {
          description: 'Invalid email format',
          content: {
            'application/json': { schema: resolver(S.standardSchemaV1(ErrorResponseSchema)) },
          },
        },
        404: {
          description: 'User not found',
          content: {
            'application/json': { schema: resolver(S.standardSchemaV1(ErrorResponseSchema)) },
          },
        },
      },
    }),
    validator('query', S.standardSchemaV1(ByEmailQuerySchema), validationErrorHook),
    (c) => {
      const { email } = c.req.valid('query');

      return runEffect(
        c,
        runtime,
        pipe(
          CrfClientService,
          Effect.flatMap((client) => client.findUserIdByEmail(email)),
          Effect.flatMap((result) =>
            result !== null && result !== ''
              ? Effect.succeed({ userId: result })
              : Effect.fail(new CrfApiError({ error: 'User not found', code: 'user_not_found' }))
          )
        )
      );
    }
  );

  return users;
};
