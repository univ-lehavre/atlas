import { describe, expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

import { GET } from '../../src/routes/api/v1/me/+server';

// Minimal RequestEvent stub — the handler only reads `locals.userId`.
const makeEvent = (userId: string | undefined): RequestEvent =>
  ({ locals: { userId } }) as unknown as RequestEvent;

describe('GET /api/v1/me', () => {
  it('returns 200 with the userId when locals.userId is set', async () => {
    const res = await GET(
      // @ts-expect-error — we pass a partial event ; the handler only
      // touches `locals`.
      makeEvent('user-123')
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { userId: string } | null;
      error: unknown;
    };
    expect(body.data).toEqual({ userId: 'user-123' });
    expect(body.error).toBeNull();
  });

  it('returns 401 unauthenticated when locals.userId is absent', async () => {
    const res = await GET(
      // @ts-expect-error — partial event stub.
      makeEvent()
    );
    expect(res.status).toBe(401);
    const body = (await res.json()) as {
      data: unknown;
      error: { code: string; message: string } | null;
    };
    expect(body.data).toBeNull();
    expect(body.error?.code).toBe('unauthenticated');
  });
});
