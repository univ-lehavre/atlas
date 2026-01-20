import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Effect, pipe } from 'effect';
import { redcap } from '../redcap.js';

const users = new Hono();

/**
 * GET /users/by-email
 * Find a user by email in REDCap
 */
const byEmailQuerySchema = z.object({
  email: z.string().email(),
});

users.get('/by-email', zValidator('query', byEmailQuerySchema), async (c) => {
  const { email } = c.req.valid('query');

  const result = await pipe(redcap.findUserIdByEmail(email), Effect.runPromise);

  return result !== null && result !== ''
    ? c.json({ data: { userId: result } })
    : c.json({ data: null, error: { code: 'not_found', message: 'User not found' } }, 404);
});

export { users };
