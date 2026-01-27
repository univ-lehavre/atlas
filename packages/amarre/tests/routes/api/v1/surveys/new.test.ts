import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/services/surveys', () => ({ newRequest: vi.fn() }));

describe('POST /api/v1/surveys/new (anti-derive OpenAPI)', () => {
  it('401 when unauthenticated', async () => {
    const mod = await import('../../../../../src/routes/api/v1/surveys/new/+server');
    const res = await mod.POST({ locals: {}, fetch: vi.fn() } as never);

    expect(res.status).toBe(401);
    const body = await res.json();

    // Validate response structure
    expect(body).toMatchObject({
      data: null,
      error: { code: 'unauthenticated', message: 'No authenticated user' },
    });
  });

  it('409 when there are incomplete survey requests', async () => {
    const services = await import('$lib/server/services/surveys');
    const newRequest = services.newRequest as unknown as ReturnType<typeof vi.fn>;

    newRequest.mockResolvedValue({ count: 1 });

    const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url === '/api/v1/me') {
        return {
          json: vi.fn().mockResolvedValue({
            data: { id: 'user_1', email: 'test@inserm.fr', labels: [] },
            error: null,
          }),
        };
      }

      if (url === '/api/v1/surveys/list') {
        expect(init?.method).toBeUndefined();
        return {
          json: vi.fn().mockResolvedValue({
            data: [
              {
                record_id: 'abc123',
                created_at: '2025-12-17T12:34:56Z',
                form_complete: '1',
                demandeur_composante_complete: '2',
                labo_complete: '2',
                encadrant_complete: '2',
                validation_finale_complete: '2',
              },
            ],
            error: null,
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const mod = await import('../../../../../src/routes/api/v1/surveys/new/+server');
    const res = await mod.POST({ locals: { userId: 'user_1' }, fetch: mockFetch } as never);

    expect(res.status).toBe(409);
    const body = await res.json();

    expect(body).toMatchObject({
      data: null,
      error: { code: 'conflict', message: 'There are incomplete survey requests' },
    });
    expect(newRequest).not.toHaveBeenCalled();
  });

  it('200 when creating new request successfully', async () => {
    const services = await import('$lib/server/services/surveys');
    const newRequest = services.newRequest as unknown as ReturnType<typeof vi.fn>;

    newRequest.mockResolvedValue({ count: 1 });

    const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url === '/api/v1/me') {
        return {
          json: vi.fn().mockResolvedValue({
            data: { id: 'user_1', email: 'test@inserm.fr', labels: [] },
            error: null,
          }),
        };
      }

      if (url === '/api/v1/surveys/list') {
        return { json: vi.fn().mockResolvedValue({ data: [], error: null }) };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const mod = await import('../../../../../src/routes/api/v1/surveys/new/+server');
    const res = await mod.POST({ locals: { userId: 'user_1' }, fetch: mockFetch } as never);

    expect(res.status).toBe(200);

    const body = await res.json();

    // Validate response structure
    expect(body.error).toBeNull();
    expect(body.data).toMatchObject({ newRequestCreated: 1 });
  });
});
