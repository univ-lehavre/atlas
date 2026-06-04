/**
 * Bearer authentication middleware for the CRF service API.
 *
 * The CRF service holds the backing service API token and exposes routes that
 * return data about identified natural persons. Network-level default-deny is
 * not enough on its own (ADR 0030: "no anonymous endpoint exposing persons");
 * this middleware adds an application-level guard as defence in depth
 * (ADR 0041).
 *
 * The expected token is a static shared secret injected by environment (same
 * mechanism as `REDCAP_API_TOKEN`). Verification is **stateless** — no session
 * store, nothing to replicate between instances — and the comparison is done in
 * **constant time** so the secret cannot leak through response timing.
 *
 * Mounted on `/api/*` before the v1 routes; `/health`, `/openapi.json` and
 * `/docs` stay open (the guard protects data, not probeability).
 *
 * @module
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import type { Hono } from 'hono';

type Middleware = Parameters<Hono['use']>[1];

const BEARER_PREFIX = 'Bearer ';

/**
 * Constant-time equality of two secrets.
 *
 * Both values are SHA-256–hashed first so the inputs compared by
 * `timingSafeEqual` are always the same length: this keeps the comparison
 * constant-time *and* prevents leaking the secret's length through an
 * early length mismatch.
 */
const secretsMatch = (presented: string, expected: string): boolean => {
  const presentedDigest = createHash('sha256').update(presented).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(presentedDigest, expectedDigest);
};

const unauthorized = {
  data: null,
  error: { code: 'unauthorized', message: 'Authentication required' },
} as const;

/**
 * Extracts a non-empty Bearer token from an `Authorization` header value, or
 * `null` when the header is absent, not a Bearer, or carries an empty token.
 */
const extractBearer = (header: string | undefined): string | null => {
  const value =
    header?.startsWith(BEARER_PREFIX) === true ? header.slice(BEARER_PREFIX.length) : '';
  return value === '' ? null : value;
};

/**
 * Builds a Hono middleware that requires `Authorization: Bearer <token>` with a
 * token matching `expectedToken`. Responds `401` (existing error envelope) when
 * the header is missing, malformed, or the token does not match.
 *
 * The expected token is injected (not read from the environment here) so the
 * middleware is testable in isolation and wired from `env` in `createApp`.
 */
export const bearerAuth = (expectedToken: string): Middleware => {
  return async (c, next) => {
    const presented = extractBearer(c.req.header('Authorization'));
    const authorized = presented !== null && secretsMatch(presented, expectedToken);
    return authorized ? next() : c.json(unauthorized, 401);
  };
};
