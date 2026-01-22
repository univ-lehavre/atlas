import { Hono } from 'hono';
import { Schema as S } from 'effect';
import { resolver, validator as effectValidator, describeRoute } from 'hono-openapi';
import { Effect, pipe } from 'effect';
import { RedcapApiError } from '@univ-lehavre/atlas-redcap-api';
import { redcap } from '../redcap.js';
import { runEffect } from '../effect-handler.js';

// --- Schemas ---

const Email = S.String.pipe(S.pattern(/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/), S.brand('Email'));

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

const ErrorResponseSchema = S.Struct({
  data: S.Null,
  error: S.Struct({
    code: S.String,
    message: S.String,
  }),
}).annotations({ identifier: 'ErrorResponse', description: 'Error API response' });

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
  effectValidator('query', S.standardSchemaV1(ByEmailQuerySchema)),
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
