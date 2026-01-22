import { Hono } from 'hono';
import { Schema as S } from 'effect';
import { effectValidator } from '@hono/effect-validator';
import { Effect, pipe } from 'effect';
import { RedcapApiError } from '@univ-lehavre/atlas-redcap-api';
import { redcap } from '../redcap.js';
import { runEffect } from '../effect-handler.js';

/**
 * Branded type for Email
 */
const Email = S.String.pipe(S.pattern(/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/), S.brand('Email'));

const users = new Hono();

/**
 * GET /users/by-email
 * Find a user by email in REDCap
 */
const ByEmailQuerySchema = S.Struct({
  email: Email,
});

users.get('/by-email', effectValidator('query', ByEmailQuerySchema), (c) => {
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
});

export { users };
