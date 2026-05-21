// Level-4 integration tests : amarre's magic-link auth flow against a
// real Appwrite + Mailpit stack. Self-skips when either is unreachable.
//
// What's covered :
//
//   1. signupWithEmail() reaches Appwrite and returns a Token.
//   2. Appwrite's worker-mails actually dispatches the magic-link email
//      and Mailpit receives it.
//   3. The email body contains a parseable userId+secret pair.
//   4. login(userId, secret, cookies) opens a real Appwrite session
//      (verified via the admin SDK's listSessions).
//
// Bring the stack up first :
//   pnpm -F @univ-lehavre/atlas-amarre-sandbox start

import type { Cookies } from '@sveltejs/kit';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { login, signupWithEmail } from '$lib/server/services/auth';
import { countSessions, deleteUserByEmail, isAppwriteReachable } from '../helpers/appwrite';
import {
  extractMagicLinkParams,
  isMailpitReachable,
  pollForMessage,
  purgeMailpit,
} from '../helpers/mailpit';

// Probe both backends. Either being down skips the whole suite.
const [appwriteUp, mailpitUp] = await Promise.all([isAppwriteReachable(), isMailpitReachable()]);
const stackReady = appwriteUp && mailpitUp;

// All test emails carry this prefix so afterAll can target them precisely
// without touching anything else in the sandbox.
const TEST_PREFIX = 'amarre-l4-';
// Pick a domain that satisfies ALLOWED_DOMAINS_REGEXP from .env.example
// ("@(example\.org|univ-lehavre\.fr)").
const TEST_DOMAIN = 'example.org';

const createdEmails: string[] = [];

const makeEmail = (suffix: string): string => {
  const email = `${TEST_PREFIX}${suffix}-${Date.now()}@${TEST_DOMAIN}`;
  createdEmails.push(email);
  return email;
};

/**
 * Minimal in-memory `Cookies` implementation. SvelteKit hands the real
 * one to route handlers ; for service-layer tests we just need the
 * `set`/`get` surface so the auth service can stash the session token.
 */
const makeCookieJar = (): Cookies => {
  const store = new Map<string, string>();
  return {
    get: (name) => store.get(name),
    getAll: () => [...store.entries()].map(([name, value]) => ({ name, value })),
    set: (name, value) => {
      store.set(name, value);
    },
    delete: (name) => {
      store.delete(name);
    },
    serialize: () => '',
  };
};

describe.skipIf(!stackReady)('amarre auth — magic-link integration', () => {
  beforeEach(async () => {
    await purgeMailpit();
  });

  afterAll(async () => {
    await Promise.all(createdEmails.map(deleteUserByEmail));
    await purgeMailpit();
  });

  it('signupWithEmail() returns a token for a valid domain email', async () => {
    const email = makeEmail('signup');
    const token = await signupWithEmail(email, { fetch: globalThis.fetch.bind(globalThis) });
    expect(token).toMatchObject({
      userId: expect.any(String),
      secret: expect.any(String),
    });
  });

  it('signupWithEmail() rejects an email outside the allowed domain', async () => {
    const email = `${TEST_PREFIX}bogus@not-an-allowed-domain.test`;
    await expect(
      signupWithEmail(email, { fetch: globalThis.fetch.bind(globalThis) })
    ).rejects.toThrow();
  });

  it('Appwrite dispatches a magic-link email that Mailpit receives', async () => {
    const email = makeEmail('mail');
    await signupWithEmail(email, { fetch: globalThis.fetch.bind(globalThis) });
    const message = await pollForMessage(email, 30_000);
    expect(message).not.toBeNull();
    const params = extractMagicLinkParams(message!);
    expect(params).not.toBeNull();
    expect(params!.userId).toBeTruthy();
    expect(params!.secret).toBeTruthy();
  });

  it('login(userId, secret) opens a real Appwrite session', async () => {
    const email = makeEmail('login');
    await signupWithEmail(email, { fetch: globalThis.fetch.bind(globalThis) });
    const message = await pollForMessage(email, 30_000);
    const params = extractMagicLinkParams(message!);
    const cookies = makeCookieJar();
    const session = await login(params!.userId, params!.secret, cookies);
    expect(session.userId).toBe(params!.userId);
    // Admin SDK confirms the session is live server-side.
    await expect(countSessions(session.userId)).resolves.toBeGreaterThanOrEqual(1);
    // The session cookie was set by the auth service.
    expect(cookies.get('session')).toBeTruthy();
  });
});
