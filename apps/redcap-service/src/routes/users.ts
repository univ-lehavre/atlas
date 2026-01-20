import { Hono } from 'hono';
import { Schema as S } from 'effect';
import { effectValidator } from '@hono/effect-validator';
import { Effect, pipe } from 'effect';
import { redcap } from '../redcap.js';

/**
 * Branded type for Email
 */
const Email = S.String.pipe(S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/), S.brand('Email'));

const users = new Hono();

/**
 * GET /users/by-email
 * Find a user by email in REDCap
 */
const ByEmailQuerySchema = S.Struct({
  email: Email,
});

users.get('/by-email', effectValidator('query', ByEmailQuerySchema), async (c) => {
  const { email } = c.req.valid('query');

  const result = await pipe(redcap.findUserIdByEmail(email), Effect.runPromise);

  return result !== null && result !== ''
    ? c.json({ data: { userId: result } })
    : c.json({ data: null, error: { code: 'not_found', message: 'User not found' } }, 404);
});

export { users };
