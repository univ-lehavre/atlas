import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/services/surveys', () => ({ downloadSurvey: vi.fn() }));

describe('GET /api/v1/surveys/download (anti-derive OpenAPI)', () => {
  it('401 when unauthenticated', async () => {
    const mod = await import('../../../../../src/routes/api/v1/surveys/download/+server');
    const res = await mod.GET({ locals: {}, fetch: vi.fn() } as never);

    expect(res.status).toBe(401);
    const body = await res.json();

    // Validate response structure
    expect(body).toMatchObject({
      data: null,
      error: { code: 'unauthenticated', message: 'No authenticated user' },
    });
  });

  it('200 when downloading survey data successfully', async () => {
    const services = await import('$lib/server/services/surveys');
    const downloadSurvey = services.downloadSurvey as unknown as ReturnType<typeof vi.fn>;

    const mockSurveyData = [
      { record_id: '1', field1: 'value1' },
      { record_id: '2', field1: 'value2' },
    ];
    downloadSurvey.mockResolvedValue(mockSurveyData);

    const mod = await import('../../../../../src/routes/api/v1/surveys/download/+server');
    const res = await mod.GET({ locals: { userId: 'user_1' }, fetch: vi.fn() } as never);

    expect(res.status).toBe(200);

    const body = await res.json();

    // Validate response structure
    expect(body.error).toBeNull();
    expect(body.data).toEqual(mockSurveyData);
  });
});
