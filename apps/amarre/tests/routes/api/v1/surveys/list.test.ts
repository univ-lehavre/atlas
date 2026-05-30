import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/services/surveys', () => ({ listRequests: vi.fn() }));

describe('GET /api/v1/surveys/list (anti-derive OpenAPI)', () => {
  it('401 est documenté et conforme au schéma', async () => {
    const mod = await import('../../../../../src/routes/api/v1/surveys/list/+server');
    const res = await mod.GET({ locals: {}, fetch: vi.fn() } as never);

    expect(res.status).toBe(401);
    expect(mod._openapi.responses[401]).toBeTruthy();

    const body = await res.json();
    const schema = mod._openapi.responses[401].content['application/json'].schema;
    expect(() => schema.parse(body)).not.toThrow();

    // Attendu par l’implémentation
    expect(body).toMatchObject({
      data: null,
      error: { code: 'unauthenticated', message: 'No authenticated user' },
    });
  });

  it('200 est documenté et conforme au schéma', async () => {
    const services = await import('$lib/server/services/surveys');
    const listRequests = services.listRequests as unknown as ReturnType<typeof vi.fn>;

    listRequests.mockResolvedValue([
      {
        record_id: 'abc123',
        created_at: '2025-12-17T12:34:56Z',
        demandeur_statut: 'autre',
        invitation_type: '1',
        mobilite_type: 'v1',
        invite_nom: 'Jean Dupont',
        mobilite_universite_eunicoast: 'EH',
        mobilite_universite_gu8: 'GU8',
        mobilite_universite_autre: 'Le Havre',
        form_complete: '2',
        avis_composante_position: 'ok',
        demandeur_composante_complete: '1',
        avis_laboratoire_position: 'ok',
        labo_complete: '0',
        avis_encadrant_position: 'ok',
        encadrant_complete: '2',
        validation_finale_complete: '0',
      },
    ]);

    const mod = await import('../../../../../src/routes/api/v1/surveys/list/+server');
    const res = await mod.GET({ locals: { userId: 'user_1' }, fetch: vi.fn() } as never);

    expect(res.status).toBe(200);
    expect(mod._openapi.responses[200]).toBeTruthy();

    const body = await res.json();
    const schema = mod._openapi.responses[200].content['application/json'].schema;
    expect(() => schema.parse(body)).not.toThrow();

    expect(body.error).toBeNull();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('mappe les erreurs upstream sur une réponse JSON (payload malformé)', async () => {
    // L'endpoint n'a ni body ni query ; le "payload malformé" pertinent
    // ici est un payload upstream que `listRequests` ne sait pas
    // valider. On vérifie que le handler ne laisse pas fuiter une 500
    // HTML mais renvoie bien l'enveloppe JSON normalisée par
    // mapErrorToResponse.
    const services = await import('$lib/server/services/surveys');
    const listRequests = services.listRequests as unknown as ReturnType<typeof vi.fn>;

    listRequests.mockRejectedValueOnce(new Error('upstream returned malformed payload'));

    const mod = await import('../../../../../src/routes/api/v1/surveys/list/+server');
    const res = await mod.GET({ locals: { userId: 'user_1' }, fetch: vi.fn() } as never);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = await res.json();
    expect(body).toMatchObject({ data: null, error: { code: expect.any(String) } });
  });
});
