import { describe, expect, it } from 'vitest';
import { ApplicationError, SessionError } from '@univ-lehavre/atlas-errors';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';
import { withHandler, type ErrorMapper } from './with-handler.js';

// Custom mapper used by find-an-expert (flat `{ code, message }` shape).
// Declared at module scope to satisfy unicorn/consistent-function-scoping.
const flatMapper: ErrorMapper = (error) => {
  if (error instanceof ApplicationError) {
    const base = { code: error.code, message: error.message };
    const body = error.cause === undefined ? base : { ...base, cause: error.cause };
    return { body, status: error.httpStatus };
  }
  return {
    body: { code: 'unexpected_error', message: 'Unknown error' },
    status: 500,
  };
};

describe('withHandler', () => {
  describe('success branch', () => {
    it('serialises plain return values with Response.json (default 200)', async () => {
      const handler = withHandler(async () => ({ hello: 'world' }));
      const res = await handler(createRouteEvent());

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toMatch(/application\/json/);
      expect(await res.json()).toEqual({ hello: 'world' });
    });

    it('honours successStatus when wrapping a non-Response value', async () => {
      const handler = withHandler(async () => ({ created: true }), { successStatus: 201 });
      const res = await handler(createRouteEvent());

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ created: true });
    });

    it('forwards a Response returned by the inner function as-is', async () => {
      const handler = withHandler(
        async () =>
          new Response('binary-payload', {
            status: 200,
            headers: { 'Content-Type': 'application/pdf' },
          })
      );
      const res = await handler(createRouteEvent());

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
      expect(await res.text()).toBe('binary-payload');
    });

    it('merges extra headers into a returned Response', async () => {
      const handler = withHandler(
        async () =>
          new Response('ok', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          }),
        { headers: { 'X-RateLimit-Remaining': '29' } }
      );
      const res = await handler(createRouteEvent());

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('text/plain');
      expect(res.headers.get('x-ratelimit-remaining')).toBe('29');
      expect(await res.text()).toBe('ok');
    });

    it('attaches extra headers when serialising a plain value', async () => {
      const handler = withHandler(async () => ({ ok: true }), {
        headers: { 'X-RateLimit-Limit': '30' },
      });
      const res = await handler(createRouteEvent());

      expect(res.headers.get('x-ratelimit-limit')).toBe('30');
      expect(await res.json()).toEqual({ ok: true });
    });

    it('passes the RequestEvent through to the inner function', async () => {
      const event = createRouteEvent<{ userId: string }>({
        url: 'https://example.com/api/v1/me',
        ip: '10.0.0.1',
        locals: { userId: 'user-42' },
      });
      const handler = withHandler(async (e) => ({
        userId: (e.locals as { userId: string }).userId,
        ip: e.getClientAddress(),
        path: e.url.pathname,
      }));

      const res = await handler(event);
      expect(await res.json()).toEqual({
        userId: 'user-42',
        ip: '10.0.0.1',
        path: '/api/v1/me',
      });
    });
  });

  describe('error branch (default mapError = atlas-errors envelope)', () => {
    it('maps ApplicationError subclasses to their httpStatus', async () => {
      const handler = withHandler(async () => {
        throw new SessionError('Missing cookie', { cause: 'Cookie expired' });
      });
      const res = await handler(createRouteEvent());

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({
        data: null,
        error: { code: 'session_error', message: 'Missing cookie', cause: 'Cookie expired' },
      });
    });

    it('omits cause when not provided', async () => {
      const handler = withHandler(async () => {
        throw new ApplicationError('forbidden', 403, 'Not allowed');
      });
      const res = await handler(createRouteEvent());

      expect(res.status).toBe(403);
      const body = (await res.json()) as { data: null; error: { code: string; message: string } };
      expect(body.data).toBeNull();
      expect(body.error.code).toBe('forbidden');
      expect(body.error.message).toBe('Not allowed');
    });

    it('maps a generic Error to 500 with its message', async () => {
      const handler = withHandler(async () => {
        throw new Error('boom');
      });
      const res = await handler(createRouteEvent());

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        data: null,
        error: { code: 'internal_error', message: 'boom' },
      });
    });

    it('maps a non-Error throw to 500 unknown error', async () => {
      const stringError: unknown = 'string-error';
      const handler = withHandler(async () => {
        throw stringError;
      });
      const res = await handler(createRouteEvent());

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        data: null,
        error: { code: 'internal_error', message: 'Unknown error' },
      });
    });

    it('attaches extra headers on the error response', async () => {
      const handler = withHandler(
        async () => {
          throw new SessionError();
        },
        { headers: { 'X-RateLimit-Remaining': '0' } }
      );
      const res = await handler(createRouteEvent());

      expect(res.status).toBe(401);
      expect(res.headers.get('x-ratelimit-remaining')).toBe('0');
    });
  });

  describe('custom mapError (find-an-expert flat shape)', () => {
    it('uses the custom mapper for ApplicationError', async () => {
      const handler = withHandler(
        async () => {
          throw new SessionError('Not logged in');
        },
        { mapError: flatMapper }
      );
      const res = await handler(createRouteEvent());

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ code: 'session_error', message: 'Not logged in' });
    });

    it('uses the custom mapper for non-ApplicationError', async () => {
      const handler = withHandler(
        async () => {
          throw new Error('oops');
        },
        { mapError: flatMapper }
      );
      const res = await handler(createRouteEvent());

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ code: 'unexpected_error', message: 'Unknown error' });
    });
  });
});
