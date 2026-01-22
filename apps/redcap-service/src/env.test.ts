import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('env', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should parse valid environment variables', async () => {
    process.env['PORT'] = '4000';
    process.env['REDCAP_API_URL'] = 'https://redcap.example.com/api/';
    process.env['REDCAP_API_TOKEN'] = 'test-token';

    const { env } = await import('./env.js');

    expect(env.port).toBe(4000);
    expect(env.redcapApiUrl).toBe('https://redcap.example.com/api/');
    expect(env.redcapApiToken).toBe('test-token');
  });

  it('should use default PORT when not provided', async () => {
    process.env['REDCAP_API_URL'] = 'https://redcap.example.com/api/';
    process.env['REDCAP_API_TOKEN'] = 'test-token';
    delete process.env['PORT'];

    const { env } = await import('./env.js');

    expect(env.port).toBe(3000);
  });
});
