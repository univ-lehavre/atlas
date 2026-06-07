import { describe, it, expect, afterEach, vi } from 'vitest';
import { ConfigProvider, Effect } from 'effect';
import { CrfClientService } from '@univ-lehavre/atlas-crf-client';
import { AppConfig, loadConfig, makeAppLayer, makeCrfRuntime, type AppConfigType } from './boot.js';

const VALID: AppConfigType = {
  port: 3000,
  crfApiUrl: 'https://redcap.example.com/api/',
  crfApiToken: 'AABBCCDD11223344AABBCCDD11223344',
  authToken: 'super-secret-bearer',
  disableRateLimit: false,
};

// Read AppConfig against an explicit ConfigProvider — no process.env mutation.
const readWith = (entries: Record<string, string>): AppConfigType =>
  Effect.runSync(
    Effect.withConfigProvider(AppConfig, ConfigProvider.fromMap(new Map(Object.entries(entries))))
  );

describe('AppConfig', () => {
  it('reads the configuration from the provider', () => {
    const config = readWith({
      REDCAP_API_URL: 'https://redcap.example.com/api/',
      REDCAP_API_TOKEN: 'AABBCCDD11223344AABBCCDD11223344',
      CRF_AUTH_TOKEN: 'super-secret-bearer',
      PORT: '4500',
      DISABLE_RATE_LIMIT: 'true',
    });
    expect(config.port).toBe(4500);
    expect(config.crfApiUrl).toBe('https://redcap.example.com/api/');
    expect(config.crfApiToken).toBe('AABBCCDD11223344AABBCCDD11223344');
    expect(config.authToken).toBe('super-secret-bearer');
    expect(config.disableRateLimit).toBe(true);
  });

  it('defaults the port to 3000 and rate-limit to enabled', () => {
    const config = readWith({
      REDCAP_API_URL: 'https://redcap.example.com/api/',
      REDCAP_API_TOKEN: 'AABBCCDD11223344AABBCCDD11223344',
      CRF_AUTH_TOKEN: 'secret',
    });
    expect(config.port).toBe(3000);
    expect(config.disableRateLimit).toBe(false);
  });

  it('fails when the URL is invalid', () => {
    expect(() =>
      readWith({
        REDCAP_API_URL: 'not-a-url',
        REDCAP_API_TOKEN: 'AABBCCDD11223344AABBCCDD11223344',
        CRF_AUTH_TOKEN: 'secret',
      })
    ).toThrow();
  });

  it('loadConfig reads from the process environment', () => {
    // loadConfig() runs AppConfig against the default (process.env) provider.
    // vi.stubEnv sets/restores env vars cleanly (no manual delete).
    vi.stubEnv('REDCAP_API_URL', 'https://redcap.example.com/api/');
    vi.stubEnv('REDCAP_API_TOKEN', 'AABBCCDD11223344AABBCCDD11223344');
    vi.stubEnv('CRF_AUTH_TOKEN', 'secret');
    vi.stubEnv('PORT', '5050');

    const config = loadConfig();
    expect(config.crfApiUrl).toBe('https://redcap.example.com/api/');
    expect(config.port).toBe(5050);
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('makeAppLayer / makeCrfRuntime', () => {
  it('builds a runtime whose layer provides CrfClientService', async () => {
    const runtime = makeCrfRuntime(VALID);
    try {
      const client = await runtime.runPromise(CrfClientService);
      expect(typeof client.getVersion).toBe('function');
      expect(typeof client.exportRecords).toBe('function');
    } finally {
      await runtime.dispose();
    }
  });

  it('makeAppLayer does not throw for a valid config', () => {
    expect(() => makeAppLayer(VALID)).not.toThrow();
  });
});
