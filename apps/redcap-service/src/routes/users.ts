import { Hono } from 'hono';
import { Schema as S } from 'effect';
import { resolver, validator, describeRoute } from 'hono-openapi';
import { Effect, pipe } from 'effect';
import { RedcapApiError } from '@univ-lehavre/atlas-redcap-api';
import { redcap } from '../redcap.js';
import { runEffect } from '../effect-handler.js';
import { validationErrorHook } from '../middleware/validation.js';
import { ErrorResponseSchema, EMAIL_PATTERN } from '../schemas.js';

// --- Schemas ---

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

// --- Routes ---

const users = new Hono();

/**
 * GET /users/by-email
 * Find a user by email in REDCap
 */
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
      pipe(
        redcap.findUserIdByEmail(email),
        Effect.flatMap((result) =>
          result !== null && result !== ''
            ? Effect.succeed({ userId: result })
            : Effect.fail(new RedcapApiError({ message: 'User not found' }))
        )
      )
    );
  }
);

export { users };
