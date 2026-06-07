import { describe, expect, it } from 'vitest';
import { Data, Effect, Match } from 'effect';
import { ApplicationError } from '@univ-lehavre/atlas-errors';
import { runEffectHandler, type EffectErrorMapper } from './effect.js';

// A domain TaggedError with no `status` field — like citation-fetch's
// FetchError/ResponseParseError. The consumer owns the tag→status table.
class UpstreamError extends Data.TaggedError('UpstreamError')<{ readonly message: string }> {}
class NotFoundError extends Data.TaggedError('NotFoundError')<{ readonly id: string }> {}

type DomainError = UpstreamError | NotFoundError;

// Consumer-supplied mapper, built with Match.tag — symmetric to the CRF
// service's mapErrorToResponse. Declared at module scope for
// unicorn/consistent-function-scoping.
const domainMapper: EffectErrorMapper<DomainError> = (error) =>
  Match.value(error).pipe(
    Match.tag('UpstreamError', (e) => ({
      body: { code: 'upstream_error', message: e.message },
      status: 502,
    })),
    Match.tag('NotFoundError', (e) => ({
      body: { code: 'not_found', message: `Unknown id: ${e.id}` },
      status: 404,
    })),
    Match.exhaustive
  );

describe('runEffectHandler', () => {
  describe('success branch', () => {
    it('serialises a plain success value with Response.json (default 200)', async () => {
      const res = await runEffectHandler(Effect.succeed({ hello: 'world' }));

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toMatch(/application\/json/);
      expect(await res.json()).toEqual({ hello: 'world' });
    });

    it('honours successStatus for a non-Response success value', async () => {
      const res = await runEffectHandler(Effect.succeed({ created: true }), {
        successStatus: 201,
      });

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ created: true });
    });

    it('forwards a Response yielded by the Effect as-is', async () => {
      const pdf = new Response('PDF', {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      });
      const res = await runEffectHandler(Effect.succeed(pdf));

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
      expect(await res.text()).toBe('PDF');
    });

    it('merges extra headers into both a plain value and a Response', async () => {
      const value = await runEffectHandler(Effect.succeed({ ok: true }), {
        headers: { 'x-ratelimit-remaining': '9' },
      });
      expect(value.headers.get('x-ratelimit-remaining')).toBe('9');

      const passthrough = await runEffectHandler(Effect.succeed(new Response('x')), {
        headers: { 'x-ratelimit-remaining': '9' },
      });
      expect(passthrough.headers.get('x-ratelimit-remaining')).toBe('9');
    });
  });

  describe('typed error branch', () => {
    it('maps a TaggedError to its status BEFORE runPromise — never a 500', async () => {
      const res = await runEffectHandler(
        Effect.fail(new UpstreamError({ message: 'OpenAlex down' })),
        {
          mapError: domainMapper,
        }
      );

      // The core E6 guarantee: a typed failure resolves (no rejection,
      // no FiberFailure→500 flattening) and carries the right status.
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ code: 'upstream_error', message: 'OpenAlex down' });
    });

    it('maps a different tag to a different status via the same mapper', async () => {
      const res = await runEffectHandler(Effect.fail(new NotFoundError({ id: 'I42' })), {
        mapError: domainMapper,
      });

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ code: 'not_found', message: 'Unknown id: I42' });
    });

    it('always resolves (never rejects) on a typed failure', async () => {
      // Promise.allSettled would show "rejected" if the typed error
      // escaped to runPromise. Assert it resolves.
      const settled = await Promise.allSettled([
        runEffectHandler(Effect.fail(new UpstreamError({ message: 'boom' })), {
          mapError: domainMapper,
        }),
      ]);
      expect(settled[0]?.status).toBe('fulfilled');
    });

    it('attaches extra headers to the error branch too', async () => {
      const res = await runEffectHandler(Effect.fail(new UpstreamError({ message: 'x' })), {
        mapError: domainMapper,
        headers: { 'x-ratelimit-remaining': '0' },
      });
      expect(res.status).toBe(502);
      expect(res.headers.get('x-ratelimit-remaining')).toBe('0');
    });
  });

  describe('default mapper (no mapError given)', () => {
    it('honours an ApplicationError httpStatus and code', async () => {
      const res = await runEffectHandler(
        Effect.fail(new ApplicationError('forbidden', 403, 'Nope'))
      );

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({
        data: null,
        error: { code: 'forbidden', message: 'Nope' },
      });
    });

    it('falls back to 500 internal_error for an unrecognised error', async () => {
      const res = await runEffectHandler(Effect.fail(new Error('kaboom')));

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        data: null,
        error: { code: 'internal_error', message: 'kaboom' },
      });
    });

    it('falls back to a generic message for a non-Error failure value', async () => {
      // A failure that is not an Error instance (e.g. a string) takes the
      // other branch of the default mapper.
      const res = await runEffectHandler(Effect.fail('plain string failure'));

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        data: null,
        error: { code: 'internal_error', message: 'Internal error' },
      });
    });
  });
});
