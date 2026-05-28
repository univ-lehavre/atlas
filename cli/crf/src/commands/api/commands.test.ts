import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Effect } from 'effect';
import { runTests } from './commands.js';
import type { CliContext } from '../../shared/index.js';
import { createCrfClient } from '@univ-lehavre/atlas-crf-client';

vi.mock('@univ-lehavre/atlas-crf-client', () => ({
  createCrfClient: vi.fn(),
  CrfUrl: (s: string) => s as never,
  CrfToken: (s: string) => s as never,
}));

const ciCtx = (overrides: Partial<CliContext> = {}): CliContext => ({
  ci: true,
  json: false,
  verbose: false,
  quiet: false,
  outputMode: 'ci',
  ...overrides,
});

const happyClient = {
  getVersion: () => Effect.succeed('14.0.0'),
  getProjectInfo: () => Effect.succeed({ project_title: 'Test Project' }),
  getInstruments: () => Effect.succeed([1, 2, 3]),
  getFields: () => Effect.succeed([1, 2, 3, 4, 5]),
  exportRecords: () => Effect.succeed([1]),
};

const failingClient = {
  getVersion: () => Effect.fail(new Error('boom version')),
  getProjectInfo: () => Effect.fail(new Error('boom projectInfo')),
  getInstruments: () => Effect.fail(new Error('boom instruments')),
  getFields: () => Effect.fail(new Error('boom fields')),
  exportRecords: () => Effect.fail(new Error('boom records')),
};

describe('runTests', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('returns Success when all 5 tests pass', async () => {
    vi.mocked(createCrfClient).mockReturnValue(happyClient as never);
    const code = await runTests({
      url: 'http://localhost/api',
      token: 'tok',
      ctx: ciCtx(),
    });
    expect(code).toBe(0);
  });

  it('returns Error when any test fails', async () => {
    vi.mocked(createCrfClient).mockReturnValue(failingClient as never);
    const code = await runTests({
      url: 'http://localhost/api',
      token: 'tok',
      ctx: ciCtx(),
    });
    expect(code).toBe(1);
  });

  it('returns InvalidConfig when createCrfClient throws', async () => {
    vi.mocked(createCrfClient).mockImplementation(() => {
      throw new Error('bad URL');
    });
    const code = await runTests({
      url: 'bad-url',
      token: 'tok',
      ctx: ciCtx(),
    });
    expect(code).toBe(2);
  });

  it('emits a JSON payload with success=true in JSON mode (happy path)', async () => {
    vi.mocked(createCrfClient).mockReturnValue(happyClient as never);
    await runTests({
      url: 'http://x/api',
      token: 'tok',
      ctx: ciCtx({ json: true, outputMode: 'json' }),
    });
    const jsonLine = logSpy.mock.calls.map((c) => String(c[0])).find((l) => l.startsWith('{'));
    expect(jsonLine).toBeDefined();
    const parsed = JSON.parse(jsonLine as string) as {
      url: string;
      success: boolean;
      results: readonly unknown[];
    };
    expect(parsed.url).toBe('http://x/api');
    expect(parsed.success).toBe(true);
    expect(parsed.results).toHaveLength(5);
  });

  it('emits JSON with success=false when at least one test fails', async () => {
    vi.mocked(createCrfClient).mockReturnValue(failingClient as never);
    await runTests({
      url: 'http://x/api',
      token: 'tok',
      ctx: ciCtx({ json: true, outputMode: 'json' }),
    });
    const jsonLine = logSpy.mock.calls.map((c) => String(c[0])).find((l) => l.startsWith('{'));
    const parsed = JSON.parse(jsonLine as string) as { success: boolean };
    expect(parsed.success).toBe(false);
  });

  it('emits JSON error payload when createCrfClient throws (JSON mode)', async () => {
    vi.mocked(createCrfClient).mockImplementation(() => {
      throw new Error('bad URL');
    });
    const code = await runTests({
      url: 'bad',
      token: 'tok',
      ctx: ciCtx({ json: true, outputMode: 'json' }),
    });
    expect(code).toBe(2);
    const jsonLine = logSpy.mock.calls.map((c) => String(c[0])).find((l) => l.startsWith('{'));
    expect(jsonLine).toBeDefined();
    const parsed = JSON.parse(jsonLine as string) as {
      error: string;
      details: string;
    };
    expect(parsed.error).toBe('Invalid configuration');
    expect(parsed.details).toContain('bad URL');
  });

  it('logs 5 [OK  ] steps in CI mode on success', async () => {
    vi.mocked(createCrfClient).mockReturnValue(happyClient as never);
    await runTests({
      url: 'http://x/api',
      token: 'tok',
      ctx: ciCtx(),
    });
    const steps = logSpy.mock.calls.map((c) => String(c[0])).filter((l) => l.startsWith('[OK  ]'));
    expect(steps).toHaveLength(5);
    expect(steps[0]).toContain('Version');
  });

  it('logs 5 [FAIL] steps in CI mode when everything fails', async () => {
    vi.mocked(createCrfClient).mockReturnValue(failingClient as never);
    await runTests({
      url: 'http://x/api',
      token: 'tok',
      ctx: ciCtx(),
    });
    const steps = logSpy.mock.calls.map((c) => String(c[0])).filter((l) => l.startsWith('[FAIL]'));
    expect(steps).toHaveLength(5);
  });
});
