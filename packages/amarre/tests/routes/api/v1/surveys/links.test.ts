import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/services/surveys', () => ({ getSurveyUrl: vi.fn() }));

describe('GET /api/v1/surveys/links (anti-derive OpenAPI)', () => {
  it('401 est documenté et conforme au schéma', async () => {
    const mod = await import('../../../../../src/routes/api/v1/surveys/links/+server');
    const res = await mod.GET({
      locals: {},
      fetch: vi.fn(),
      url: new URL('https://example.test'),
    } as never);

    expect(res.status).toBe(401);
    expect(mod._openapi.responses[401]).toBeTruthy();

    const body = await res.json();
    const schema = mod._openapi.responses[401].content['application/json'].schema;
    expect(() => schema.parse(body)).not.toThrow();

    expect(body).toMatchObject({
      data: null,
      error: { code: 'unauthenticated', message: 'No authenticated user' },
    });
  });

  it('400 est documenté et conforme au schéma (query manquante)', async () => {
    const mod = await import('../../../../../src/routes/api/v1/surveys/links/+server');
    const res = await mod.GET({
      locals: { userId: 'user_1' },
      fetch: vi.fn(),
      url: new URL('https://example.test'),
    } as never);

    expect(res.status).toBe(400);
    expect(mod._openapi.responses[400]).toBeTruthy();

    const body = await res.json();
    const schema = mod._openapi.responses[400].content['application/json'].schema;
    expect(() => schema.parse(body)).not.toThrow();

    expect(body).toMatchObject({ data: null, error: { code: 'bad_request' } });
  });

  it('200 est documenté et conforme au schéma', async () => {
    const services = await import('$lib/server/services/surveys');
    const getSurveyUrl = services.getSurveyUrl as unknown as ReturnType<typeof vi.fn>;

    getSurveyUrl.mockResolvedValue('https://example.com/survey');

    const mod = await import('../../../../../src/routes/api/v1/surveys/links/+server');
    const res = await mod.GET({
      locals: { userId: 'user_1' },
      fetch: vi.fn(),
      url: new URL('https://example.test?record=abc123&instrument=create_my_project'),
    } as never);

    expect(res.status).toBe(200);
    expect(mod._openapi.responses[200]).toBeTruthy();

    const body = await res.json();
    const schema = mod._openapi.responses[200].content['application/json'].schema;
    expect(() => schema.parse(body)).not.toThrow();

    expect(body.error).toBeNull();
    expect(body.data).toMatchObject({ url: 'https://example.com/survey' });
  });

  it('422 est documenté et conforme au schéma (lien invalide)', async () => {
    const services = await import('$lib/server/services/surveys');
    const getSurveyUrl = services.getSurveyUrl as unknown as ReturnType<typeof vi.fn>;

    getSurveyUrl.mockResolvedValue('{"error": "something went wrong"}');

    const mod = await import('../../../../../src/routes/api/v1/surveys/links/+server');
    const res = await mod.GET({
      locals: { userId: 'user_1' },
      fetch: vi.fn(),
      url: new URL('https://example.test?record=abc123&instrument=create_my_project'),
    } as never);

    expect(res.status).toBe(422);
    expect(mod._openapi.responses[422]).toBeTruthy();

    const body = await res.json();
    const schema = mod._openapi.responses[422].content['application/json'].schema;
    expect(() => schema.parse(body)).not.toThrow();

    expect(body).toMatchObject({
      data: null,
      error: { code: 'invalid_url', message: 'Invalid or missing URL' },
    });
  });
});
