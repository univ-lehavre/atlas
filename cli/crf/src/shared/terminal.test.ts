import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CliContext } from './context.js';
import {
  formatJson,
  intro,
  log,
  outputJson,
  outro,
  promptConfirm,
  promptSelect,
  promptText,
  spinner,
} from './terminal.js';

vi.mock('@clack/prompts', () => ({
  log: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  intro: vi.fn(),
  outro: vi.fn(),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    message: vi.fn(),
  })),
}));

const p = await import('@clack/prompts');

const ctx = (overrides: Partial<CliContext> = {}): CliContext => ({
  ci: false,
  json: false,
  verbose: false,
  quiet: false,
  outputMode: 'human',
  ...overrides,
});

describe('formatJson', () => {
  it('formats primitives', () => expect(formatJson(42)).toBe('42'));
  it('formats objects with 2-space indent', () => {
    expect(formatJson({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
  it('formats arrays', () => {
    expect(formatJson([1, 2])).toBe('[\n  1,\n  2\n]');
  });
  it('handles null', () => expect(formatJson(null)).toBe('null'));
});

describe('log', () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;
  let consoleWarn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLog.mockRestore();
    consoleError.mockRestore();
    consoleWarn.mockRestore();
    vi.clearAllMocks();
  });

  describe('info', () => {
    it('is silent in json mode', () => {
      log.info(ctx({ json: true }), 'msg');
      expect(consoleLog).not.toHaveBeenCalled();
      expect(p.log.info).not.toHaveBeenCalled();
    });
    it('is silent in quiet mode', () => {
      log.info(ctx({ quiet: true }), 'msg');
      expect(consoleLog).not.toHaveBeenCalled();
      expect(p.log.info).not.toHaveBeenCalled();
    });
    it('writes [INFO] in CI mode', () => {
      log.info(ctx({ ci: true }), 'msg');
      expect(consoleLog).toHaveBeenCalledWith('[INFO] msg');
    });
    it('delegates to clack in human mode', () => {
      log.info(ctx(), 'msg');
      expect(p.log.info).toHaveBeenCalledWith('msg');
    });
  });

  describe('success', () => {
    it('is silent in json mode', () => {
      log.success(ctx({ json: true }), 'msg');
      expect(consoleLog).not.toHaveBeenCalled();
      expect(p.log.success).not.toHaveBeenCalled();
    });
    it('is silent in quiet mode', () => {
      log.success(ctx({ quiet: true }), 'msg');
      expect(consoleLog).not.toHaveBeenCalled();
    });
    it('writes [OK] in CI mode', () => {
      log.success(ctx({ ci: true }), 'msg');
      expect(consoleLog).toHaveBeenCalledWith('[OK] msg');
    });
    it('delegates to clack in human mode', () => {
      log.success(ctx(), 'msg');
      expect(p.log.success).toHaveBeenCalledWith('msg');
    });
  });

  describe('error', () => {
    it('is silent in json mode', () => {
      log.error(ctx({ json: true }), 'msg');
      expect(consoleError).not.toHaveBeenCalled();
      expect(p.log.error).not.toHaveBeenCalled();
    });
    it('writes even in quiet mode (errors always surface)', () => {
      log.error(ctx({ quiet: true }), 'msg');
      expect(p.log.error).toHaveBeenCalledWith('msg');
    });
    it('writes [ERROR] in CI mode', () => {
      log.error(ctx({ ci: true }), 'msg');
      expect(consoleError).toHaveBeenCalledWith('[ERROR] msg');
    });
  });

  describe('warn', () => {
    it('is silent in json mode', () => {
      log.warn(ctx({ json: true }), 'msg');
      expect(consoleWarn).not.toHaveBeenCalled();
      expect(p.log.warn).not.toHaveBeenCalled();
    });
    it('is silent in quiet mode', () => {
      log.warn(ctx({ quiet: true }), 'msg');
      expect(consoleWarn).not.toHaveBeenCalled();
    });
    it('writes [WARN] in CI mode', () => {
      log.warn(ctx({ ci: true }), 'msg');
      expect(consoleWarn).toHaveBeenCalledWith('[WARN] msg');
    });
    it('delegates to clack in human mode', () => {
      log.warn(ctx(), 'msg');
      expect(p.log.warn).toHaveBeenCalledWith('msg');
    });
  });

  describe('step', () => {
    it('is silent in json mode', () => {
      log.step(ctx({ json: true }), 'connect', 'ok');
      expect(consoleLog).not.toHaveBeenCalled();
    });
    it('formats CI step with status code', () => {
      log.step(ctx({ ci: true }), 'connect', 'ok', 12);
      expect(consoleLog).toHaveBeenCalledWith('[OK  ] connect 12ms');
    });
    it('formats human step with icon (no latency)', () => {
      log.step(ctx(), 'connect', 'pending');
      const arg = consoleLog.mock.calls[0]?.[0] as string;
      expect(arg).toContain('connect');
      expect(arg).not.toContain('ms');
    });
    it('reports all 4 status codes in CI mode', () => {
      const ciCtx = ctx({ ci: true });
      log.step(ciCtx, 'a', 'ok');
      log.step(ciCtx, 'b', 'error');
      log.step(ciCtx, 'c', 'pending');
      log.step(ciCtx, 'd', 'skipped');
      const lines = consoleLog.mock.calls.map((c) => c[0]);
      expect(lines).toEqual(['[OK  ] a', '[FAIL] b', '[PEND] c', '[SKIP] d']);
    });
  });

  describe('verbose', () => {
    it('is silent when verbose flag is false', () => {
      log.verbose(ctx(), 'msg');
      expect(consoleLog).not.toHaveBeenCalled();
    });
    it('is silent in json mode even when verbose', () => {
      log.verbose(ctx({ verbose: true, json: true }), 'msg');
      expect(consoleLog).not.toHaveBeenCalled();
    });
    it('is silent in quiet mode even when verbose', () => {
      log.verbose(ctx({ verbose: true, quiet: true }), 'msg');
      expect(consoleLog).not.toHaveBeenCalled();
    });
    it('writes [DEBUG] in CI mode', () => {
      log.verbose(ctx({ verbose: true, ci: true }), 'msg');
      expect(consoleLog).toHaveBeenCalledWith('[DEBUG] msg');
    });
    it('writes a dimmed line in human mode', () => {
      log.verbose(ctx({ verbose: true }), 'msg');
      expect(consoleLog).toHaveBeenCalledTimes(1);
      expect(consoleLog.mock.calls[0]?.[0]).toContain('msg');
    });
  });

  describe('message', () => {
    it('is silent in json mode', () => {
      log.message(ctx({ json: true }), 'msg');
      expect(consoleLog).not.toHaveBeenCalled();
    });
    it('writes raw message in any other mode', () => {
      log.message(ctx({ ci: true }), 'msg');
      log.message(ctx(), 'msg');
      log.message(ctx({ quiet: true }), 'msg');
      expect(consoleLog).toHaveBeenCalledTimes(3);
      expect(consoleLog).toHaveBeenNthCalledWith(1, 'msg');
    });
  });
});

describe('spinner', () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLog.mockRestore();
    vi.clearAllMocks();
  });

  it('returns no-op spinner in CI mode that logs start/stop/message', () => {
    const s = spinner(ctx({ ci: true }));
    s.start('a');
    s.message('b');
    s.stop('c');
    expect(consoleLog).toHaveBeenCalledTimes(3);
    expect(consoleLog.mock.calls.map((c) => c[0])).toEqual(['[...] a', '[...] b', 'c']);
  });

  it('returns silent spinner in JSON mode', () => {
    const s = spinner(ctx({ json: true }));
    s.start('a');
    s.message('b');
    s.stop('c');
    expect(consoleLog).not.toHaveBeenCalled();
  });

  it('delegates to clack in human mode', () => {
    const s = spinner(ctx());
    s.start('a');
    s.message('b');
    s.stop('c');
    expect(p.spinner).toHaveBeenCalledTimes(1);
  });
});

describe('intro / outro', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('intro is silent in json/ci/quiet modes', () => {
    intro(ctx({ json: true }), 't');
    intro(ctx({ ci: true }), 't');
    intro(ctx({ quiet: true }), 't');
    expect(p.intro).not.toHaveBeenCalled();
  });

  it('intro delegates to clack in human mode', () => {
    intro(ctx(), 't');
    expect(p.intro).toHaveBeenCalledTimes(1);
  });

  it('outro is silent in json/ci/quiet modes', () => {
    outro(ctx({ json: true }), 'm');
    outro(ctx({ ci: true }), 'm');
    outro(ctx({ quiet: true }), 'm');
    expect(p.outro).not.toHaveBeenCalled();
  });

  it('outro delegates to clack in human mode', () => {
    outro(ctx(), 'm');
    expect(p.outro).toHaveBeenCalledTimes(1);
  });
});

describe('promptText (CI branch)', () => {
  it('returns defaultValue when provided', async () => {
    await expect(
      promptText(ctx({ ci: true }), {
        message: 'name?',
        defaultValue: 'atlas',
      })
    ).resolves.toBe('atlas');
  });
  it('throws when no defaultValue is provided', async () => {
    await expect(promptText(ctx({ ci: true }), { message: 'name?' })).rejects.toThrow(
      /Interactive prompt not available in CI mode/
    );
  });
});

describe('promptConfirm (CI branch)', () => {
  it('returns defaultValue when provided', async () => {
    await expect(
      promptConfirm(ctx({ ci: true }), { message: 'ok?', defaultValue: true })
    ).resolves.toBe(true);
  });
  it('returns false when no defaultValue is provided', async () => {
    await expect(promptConfirm(ctx({ ci: true }), { message: 'ok?' })).resolves.toBe(false);
  });
});

describe('promptSelect (CI branch)', () => {
  it('returns defaultValue when provided', async () => {
    await expect(
      promptSelect(ctx({ ci: true }), {
        message: 'pick',
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
        defaultValue: 'b',
      })
    ).resolves.toBe('b');
  });
  it('returns the first option when no defaultValue is provided', async () => {
    await expect(
      promptSelect(ctx({ ci: true }), {
        message: 'pick',
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
      })
    ).resolves.toBe('a');
  });
  it('returns empty string when options list is empty (degenerate case)', async () => {
    await expect(
      promptSelect(ctx({ ci: true }), {
        message: 'pick',
        options: [],
      })
    ).resolves.toBe('');
  });
});

describe('outputJson', () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLog.mockRestore();
  });

  it('only writes when ctx.json is true', () => {
    outputJson(ctx(), { a: 1 });
    outputJson(ctx({ ci: true }), { a: 1 });
    expect(consoleLog).not.toHaveBeenCalled();

    outputJson(ctx({ json: true }), { a: 1 });
    expect(consoleLog).toHaveBeenCalledWith('{\n  "a": 1\n}');
  });
});
