import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/services/surveys', () => ({ downloadSurveyPdf: vi.fn() }));

describe('GET /api/v1/surveys/pdf', () => {
  it('401 when unauthenticated', async () => {
    const url = new URL('http://localhost/api/v1/surveys/pdf?record_id=test123');
    const mod = await import('../../../../../src/routes/api/v1/surveys/pdf/+server');
    const res = await mod.GET({ locals: {}, url, fetch: vi.fn() } as never);

    expect(res.status).toBe(401);
    const body = await res.json();

    expect(body).toMatchObject({
      data: null,
      error: { code: 'unauthenticated', message: 'No authenticated user' },
    });
  });

  it('400 when record_id is missing', async () => {
    const url = new URL('http://localhost/api/v1/surveys/pdf');
    const mod = await import('../../../../../src/routes/api/v1/surveys/pdf/+server');
    const res = await mod.GET({ locals: { userId: 'user_1' }, url, fetch: vi.fn() } as never);

    expect(res.status).toBe(400);
    const body = await res.json();

    expect(body).toMatchObject({
      data: null,
      error: { code: 'invalid_request', message: 'Missing record_id parameter' },
    });
  });

  it('200 when downloading PDF successfully', async () => {
    const services = await import('$lib/server/services/surveys');
    const downloadSurveyPdf = services.downloadSurveyPdf as unknown as ReturnType<typeof vi.fn>;

    const mockPdfBuffer = new ArrayBuffer(100);
    downloadSurveyPdf.mockResolvedValue(mockPdfBuffer);

    const url = new URL('http://localhost/api/v1/surveys/pdf?record_id=test123');
    const mod = await import('../../../../../src/routes/api/v1/surveys/pdf/+server');
    const res = await mod.GET({ locals: { userId: 'user_1' }, url, fetch: vi.fn() } as never);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(res.headers.get('Content-Disposition')).toContain('formulaire_test123.pdf');

    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBe(100);
  });
});
