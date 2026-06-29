import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { securityHeaders } from './hooks.server';

/**
 * Vitest sets `process.cwd()` to the package root. See
 * apps/atlas-dashboard/src/hooks.server.test.ts for the rationale.
 */
const readSvelteConfig = (): string =>
  readFileSync(path.join(process.cwd(), 'svelte.config.js'), 'utf8');

const buildEvent = (url: string) =>
  ({
    cookies: { get: () => null },
    locals: {},
    url: new URL(url),
  }) as unknown as Parameters<typeof securityHeaders>[0]['event'];

describe('crf-dashboard hooks.server.ts handle', () => {
  it('applies the shared static security headers on every response (Phase 9.2)', async () => {
    const res = await securityHeaders({
      event: buildEvent('https://dashboard.example.org/'),
      resolve: async () => new Response('ok'),
    });

    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('permissions-policy')).toContain('camera=()');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('strict-transport-security')).toBe(
      'max-age=63072000; includeSubDomains; preload'
    );
  });

  it('omits Strict-Transport-Security on plain http:// (dev traffic)', async () => {
    const res = await securityHeaders({
      event: buildEvent('http://localhost:5173/'),
      resolve: async () => new Response('ok'),
    });
    expect(res.headers.get('strict-transport-security')).toBeNull();
  });

  it('wires the shared CSP helper in svelte.config.js (Phase 9.2)', () => {
    const source = readSvelteConfig();
    expect(source).toContain("from '@univ-lehavre/atlas-sveltekit-csp'");
    expect(source).toContain('defaultCspDirectives()');
    expect(source).toContain('csp:');
    expect(source).toContain('directives: defaultCspDirectives()');
  });
});
