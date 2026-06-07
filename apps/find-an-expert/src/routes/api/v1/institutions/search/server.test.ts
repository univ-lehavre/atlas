import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Effect } from 'effect';

vi.mock('$lib/server/citation', () => ({
  searchInstitutions: vi.fn(),
}));

describe('GET /api/v1/institutions/search (rate-limited public endpoint)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with results and exposes rate-limit headers', async () => {
    const citation = await import('$lib/server/citation');
    (citation.searchInstitutions as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      Effect.succeed([{ id: 'I1', name: 'University A' }])
    );

    const mod = await import('./+server');
    const res = await mod.GET({
      url: new URL('https://example.com/api/v1/institutions/search?q=test'),
      getClientAddress: () => '203.0.113.10',
    } as never);

    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('30');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('29');
    expect(await res.json()).toEqual([{ id: 'I1', name: 'University A' }]);
  });

  it('returns 429 after the 30 req/min window is saturated', async () => {
    const citation = await import('$lib/server/citation');
    (citation.searchInstitutions as ReturnType<typeof vi.fn>).mockReturnValue(Effect.succeed([]));

    const mod = await import('./+server');
    const ip = '203.0.113.20';

    for (let i = 0; i < 30; i++) {
      const res = await mod.GET({
        url: new URL('https://example.com/api/v1/institutions/search?q=x'),
        getClientAddress: () => ip,
      } as never);
      expect(res.status).toBe(200);
    }

    const denied = await mod.GET({
      url: new URL('https://example.com/api/v1/institutions/search?q=x'),
      getClientAddress: () => ip,
    } as never);

    expect(denied.status).toBe(429);
    const body = await denied.json();
    expect(body.code).toBe('rate_limited');
    expect(denied.headers.get('Retry-After')).toMatch(/^\d+$/);
  });

  it('does not reflect raw query content in the response body (anti-XSS smoke)', async () => {
    // Phase 7.2 DevSecOps — vérifie que les payloads malicieux passés
    // en `q` ne sont pas réfléchis tels quels dans la réponse. Le
    // handler ne renvoie que le résultat upstream (mock = []) ; aucune
    // partie de la query ne doit transiter par le body.
    const citation = await import('$lib/server/citation');
    (citation.searchInstitutions as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      Effect.succeed([])
    );

    const xssPayload = '<script>alert(1)</script>';
    const mod = await import('./+server');
    const res = await mod.GET({
      url: new URL(
        `https://example.com/api/v1/institutions/search?q=${encodeURIComponent(xssPayload)}`
      ),
      getClientAddress: () => '203.0.113.30',
    } as never);

    const raw = await res.text();
    expect(raw).not.toContain('<script>');
    expect(raw).not.toContain('alert(');
  });

  it('does not reflect query content in error messages (anti-XSS on failure)', async () => {
    // Même garantie quand l'upstream échoue : l'erreur remontée (mappée
    // par `mapCitationError` en `{ code, message }`) doit décrire le
    // problème sans embarquer la query.
    const citation = await import('$lib/server/citation');
    (citation.searchInstitutions as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      Effect.fail({ _tag: 'FetchError', message: 'upstream timeout' })
    );

    const xssPayload = '<img src=x onerror=alert(1)>';
    const mod = await import('./+server');
    const res = await mod.GET({
      url: new URL(
        `https://example.com/api/v1/institutions/search?q=${encodeURIComponent(xssPayload)}`
      ),
      getClientAddress: () => '203.0.113.40',
    } as never);

    expect(res.status).toBe(502);
    const raw = await res.text();
    expect(raw).not.toContain('<img');
    expect(raw).not.toContain('onerror');
  });
});
