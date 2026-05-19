import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createRateLimiter, rateLimitHeaders, type RateLimitResult } from './rate-limit.js';

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('autorise les premières requêtes jusqu’à la limite', () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
    expect(limiter.check('ip-a')).toMatchObject({ ok: true, remaining: 2 });
    expect(limiter.check('ip-a')).toMatchObject({ ok: true, remaining: 1 });
    expect(limiter.check('ip-a')).toMatchObject({ ok: true, remaining: 0 });
  });

  it('refuse la requête suivante quand la limite est dépassée', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
    limiter.check('ip-b');
    limiter.check('ip-b');
    const denied = limiter.check('ip-b');
    expect(denied.ok).toBe(false);
    expect(denied.remaining).toBe(0);
  });

  it('réinitialise le compteur après expiration de la fenêtre', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
    limiter.check('ip-c');
    limiter.check('ip-c');
    expect(limiter.check('ip-c').ok).toBe(false);

    vi.advanceTimersByTime(60_001);

    const after = limiter.check('ip-c');
    expect(after.ok).toBe(true);
    expect(after.remaining).toBe(1);
  });

  it('isole les compteurs par clé', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    expect(limiter.check('ip-d').ok).toBe(true);
    expect(limiter.check('ip-d').ok).toBe(false);
    // Une autre IP n'est pas affectée.
    expect(limiter.check('ip-e').ok).toBe(true);
  });

  it('renvoie un resetAt cohérent avec la fenêtre', () => {
    const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 });
    const result = limiter.check('ip-f');
    expect(result.resetAt).toBe(Date.now() + 60_000);
  });
});

describe('rateLimitHeaders', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('inclut les headers standards quand la requête est autorisée', () => {
    const result: RateLimitResult = {
      ok: true,
      remaining: 10,
      resetAt: Date.now() + 60_000,
    };
    const headers = rateLimitHeaders(result, 30);
    expect(headers['X-RateLimit-Limit']).toBe('30');
    expect(headers['X-RateLimit-Remaining']).toBe('10');
    expect(headers['X-RateLimit-Reset']).toMatch(/^\d+$/);
    expect(headers['Retry-After']).toBeUndefined();
  });

  it('ajoute Retry-After quand la requête est refusée', () => {
    const result: RateLimitResult = {
      ok: false,
      remaining: 0,
      resetAt: Date.now() + 30_000,
    };
    const headers = rateLimitHeaders(result, 30);
    expect(headers['Retry-After']).toBe('30');
    expect(headers['X-RateLimit-Remaining']).toBe('0');
  });

  it('garantit un Retry-After minimum de 1 seconde', () => {
    const result: RateLimitResult = {
      ok: false,
      remaining: 0,
      resetAt: Date.now() + 100, // moins d'une seconde
    };
    const headers = rateLimitHeaders(result, 30);
    expect(headers['Retry-After']).toBe('1');
  });
});
