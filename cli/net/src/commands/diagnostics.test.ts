import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Effect } from 'effect';
import type { CliContext } from '../config/context.js';
import type { DiagnosticStep } from '@univ-lehavre/atlas-net';
import * as net from '@univ-lehavre/atlas-net';
import { runDiagnostics } from './index.js';

vi.mock('@univ-lehavre/atlas-net', () => ({
  Hostname: (s: string) => s as never,
  Port: (n: number) => n as never,
  dnsResolve: vi.fn(),
  tcpPing: vi.fn(),
  tlsHandshake: vi.fn(),
  checkInternet: vi.fn(),
}));

const spinnerStart = vi.fn();
const spinnerStop = vi.fn();
vi.mock('@clack/prompts', () => ({
  spinner: vi.fn(() => ({
    start: spinnerStart,
    stop: spinnerStop,
  })),
}));

const ciCtx = (overrides: Partial<CliContext> = {}): CliContext => ({
  ci: true,
  json: false,
  verbose: false,
  quiet: false,
  ...overrides,
});

const step = (overrides: Partial<DiagnosticStep>): DiagnosticStep => ({
  name: 'DNS Resolution',
  status: 'ok',
  ...overrides,
});

describe('runDiagnostics', () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLog.mockRestore();
  });

  it('runs DNS + TCP + TLS for an https URL and reports success', async () => {
    vi.mocked(net.dnsResolve).mockReturnValue(Effect.succeed(step({ name: 'DNS Resolution' })));
    vi.mocked(net.tcpPing).mockReturnValue(Effect.succeed(step({ name: 'TCP Connect' })));
    vi.mocked(net.tlsHandshake).mockReturnValue(Effect.succeed(step({ name: 'TLS Handshake' })));

    const result = await runDiagnostics('https://example.com', ciCtx());

    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(3);
    expect(result.steps.map((s) => s.name)).toEqual([
      'DNS Resolution',
      'TCP Connect',
      'TLS Handshake',
    ]);
    expect(net.tlsHandshake).toHaveBeenCalledTimes(1);
  });

  it('skips TLS for an http URL', async () => {
    vi.mocked(net.dnsResolve).mockReturnValue(Effect.succeed(step({ name: 'DNS Resolution' })));
    vi.mocked(net.tcpPing).mockReturnValue(Effect.succeed(step({ name: 'TCP Connect' })));

    const result = await runDiagnostics('http://example.com', ciCtx());

    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(2);
    expect(net.tlsHandshake).not.toHaveBeenCalled();
  });

  it('stops at DNS failure and adds an Internet Check step', async () => {
    vi.mocked(net.dnsResolve).mockReturnValue(
      Effect.succeed(step({ name: 'DNS Resolution', status: 'error' }))
    );
    vi.mocked(net.checkInternet).mockReturnValue(Effect.succeed(step({ name: 'Internet Check' })));

    const result = await runDiagnostics('https://example.com', ciCtx());

    expect(result.success).toBe(false);
    expect(result.steps.map((s) => s.name)).toEqual(['DNS Resolution', 'Internet Check']);
    expect(net.tcpPing).not.toHaveBeenCalled();
    expect(net.tlsHandshake).not.toHaveBeenCalled();
    expect(net.checkInternet).toHaveBeenCalledTimes(1);
  });

  it('stops at TCP failure and adds an Internet Check step', async () => {
    vi.mocked(net.dnsResolve).mockReturnValue(Effect.succeed(step({ name: 'DNS Resolution' })));
    vi.mocked(net.tcpPing).mockReturnValue(
      Effect.succeed(step({ name: 'TCP Connect', status: 'error' }))
    );
    vi.mocked(net.checkInternet).mockReturnValue(Effect.succeed(step({ name: 'Internet Check' })));

    const result = await runDiagnostics('https://example.com', ciCtx());

    expect(result.success).toBe(false);
    expect(result.steps.map((s) => s.name)).toEqual([
      'DNS Resolution',
      'TCP Connect',
      'Internet Check',
    ]);
    expect(net.tlsHandshake).not.toHaveBeenCalled();
  });

  it('reports success=false when TLS fails', async () => {
    vi.mocked(net.dnsResolve).mockReturnValue(Effect.succeed(step({ name: 'DNS Resolution' })));
    vi.mocked(net.tcpPing).mockReturnValue(Effect.succeed(step({ name: 'TCP Connect' })));
    vi.mocked(net.tlsHandshake).mockReturnValue(
      Effect.succeed(step({ name: 'TLS Handshake', status: 'error' }))
    );

    const result = await runDiagnostics('https://example.com', ciCtx());

    expect(result.success).toBe(false);
    expect(result.steps).toHaveLength(3);
  });

  it('uses the URL port when explicit', async () => {
    vi.mocked(net.dnsResolve).mockReturnValue(Effect.succeed(step({ name: 'DNS Resolution' })));
    vi.mocked(net.tcpPing).mockReturnValue(Effect.succeed(step({ name: 'TCP Connect' })));
    vi.mocked(net.tlsHandshake).mockReturnValue(Effect.succeed(step({ name: 'TLS Handshake' })));

    await runDiagnostics('https://example.com:8443', ciCtx());

    expect(net.tcpPing).toHaveBeenCalledWith('example.com' as never, 8443 as never);
  });

  it('prints CI-formatted steps to stdout when not in JSON mode', async () => {
    vi.mocked(net.dnsResolve).mockReturnValue(Effect.succeed(step({ name: 'DNS Resolution' })));
    vi.mocked(net.tcpPing).mockReturnValue(Effect.succeed(step({ name: 'TCP Connect' })));
    vi.mocked(net.tlsHandshake).mockReturnValue(Effect.succeed(step({ name: 'TLS Handshake' })));

    await runDiagnostics('https://example.com', ciCtx());

    const lines = consoleLog.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(lines.filter((l: string) => l.startsWith('[OK   ]'))).toHaveLength(3);
  });

  it('suppresses per-step output in JSON mode', async () => {
    vi.mocked(net.dnsResolve).mockReturnValue(Effect.succeed(step({ name: 'DNS Resolution' })));
    vi.mocked(net.tcpPing).mockReturnValue(Effect.succeed(step({ name: 'TCP Connect' })));
    vi.mocked(net.tlsHandshake).mockReturnValue(Effect.succeed(step({ name: 'TLS Handshake' })));

    await runDiagnostics('https://example.com', ciCtx({ json: true }));

    expect(consoleLog).not.toHaveBeenCalled();
  });

  // ── Mode human (interactif) : `runStep` passe par le spinner clack au lieu du
  //    chemin CI/JSON. C'était le trou de couverture principal (lignes 87-93).
  describe('human mode (non-CI, non-JSON)', () => {
    const humanCtx = ciCtx({ ci: false });

    it('drives a clack spinner per step (start + stop) instead of plain logs', async () => {
      vi.mocked(net.dnsResolve).mockReturnValue(Effect.succeed(step({ name: 'DNS Resolution' })));
      vi.mocked(net.tcpPing).mockReturnValue(Effect.succeed(step({ name: 'TCP Connect' })));
      vi.mocked(net.tlsHandshake).mockReturnValue(Effect.succeed(step({ name: 'TLS Handshake' })));

      const result = await runDiagnostics('https://example.com', humanCtx);

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(3);
      // 3 steps → 3 spinner cycles ; aucun console.log direct en mode human.
      expect(spinnerStart).toHaveBeenCalledTimes(3);
      expect(spinnerStop).toHaveBeenCalledTimes(3);
      expect(consoleLog).not.toHaveBeenCalled();
    });

    it('flags an errored step via the spinner and reports success=false', async () => {
      vi.mocked(net.dnsResolve).mockReturnValue(
        Effect.succeed(step({ name: 'DNS Resolution', status: 'error' }))
      );
      vi.mocked(net.checkInternet).mockReturnValue(
        Effect.succeed(step({ name: 'Internet Check' }))
      );

      const result = await runDiagnostics('https://example.com', humanCtx);

      expect(result.success).toBe(false);
      expect(result.steps.map((s) => s.name)).toEqual(['DNS Resolution', 'Internet Check']);
      expect(spinnerStart).toHaveBeenCalledTimes(2);
      expect(spinnerStop).toHaveBeenCalledTimes(2);
    });
  });
});
