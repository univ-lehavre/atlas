import { describe, expect, it } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

// Phase 3 — l'endpoint `/openapi.json` est public et statique. On
// vérifie surtout (a) le code 200, (b) le Content-Type JSON et
// l'en-tête Cache-Control (contrat consommé par les clients SDK),
// et (c) la structure minimale de la spec (openapi 3.x + paths).
// L'endpoint n'a pas de payload entrant : pas de cas "401" ni
// "malformé" — on documente ces non-cas pour la traçabilité.

describe('GET /api/v1/openapi.json', () => {
  it('returns 200 with the OpenAPI spec and a JSON content-type', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent() as never);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toMatch(/application\/json/);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600');

    const body = await res.json();
    expect(body.openapi).toMatch(/^3\./);
    expect(body.info?.title).toBe('ECRIN API');
    expect(body.paths).toBeTypeOf('object');
    expect(body.paths['/me']).toBeDefined();
    expect(body.paths['/auth/signup']).toBeDefined();
  });

  it('exposes the same payload regardless of authentication (public endpoint)', async () => {
    const mod = await import('./+server');
    const anon = await mod.GET(createRouteEvent({ locals: {} }) as never);
    const authed = await mod.GET(createRouteEvent({ locals: { userId: 'user-1' } }) as never);

    expect(anon.status).toBe(200);
    expect(authed.status).toBe(200);
    const anonBody = await anon.json();
    const authedBody = await authed.json();
    expect(anonBody).toEqual(authedBody);
  });

  it('ignores spurious query strings and headers (no input contract)', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/openapi.json?evil=%3Cscript%3E',
        headers: { 'x-injected': '<script>alert(1)</script>' },
      }) as never
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain('<script>');
  });
});
