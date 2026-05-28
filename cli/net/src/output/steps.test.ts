import { describe, it, expect } from 'vitest';
import type { DiagnosticStep } from '@univ-lehavre/atlas-net';
import { formatStepCi, formatStepHuman } from './steps.js';

const step = (overrides: Partial<DiagnosticStep> = {}): DiagnosticStep => ({
  name: 'DNS Resolution',
  status: 'ok',
  ...overrides,
});

describe('formatStepCi', () => {
  it('renders status in upper case, padded to 5', () => {
    expect(formatStepCi(step({ status: 'ok' }))).toBe('[OK   ] DNS Resolution');
    expect(formatStepCi(step({ status: 'error' }))).toBe('[ERROR] DNS Resolution');
    expect(formatStepCi(step({ status: 'skipped' }))).toBe('[SKIPPED] DNS Resolution');
  });

  it('appends latency in ms when provided', () => {
    expect(formatStepCi(step({ latencyMs: 42 }))).toBe('[OK   ] DNS Resolution 42ms');
  });

  it('appends message after a dash when provided', () => {
    expect(formatStepCi(step({ message: 'resolved to 1.2.3.4' }))).toBe(
      '[OK   ] DNS Resolution - resolved to 1.2.3.4'
    );
  });

  it('combines latency and message', () => {
    expect(formatStepCi(step({ latencyMs: 10, message: 'resolved to 1.2.3.4' }))).toBe(
      '[OK   ] DNS Resolution 10ms - resolved to 1.2.3.4'
    );
  });
});

describe('formatStepHuman', () => {
  it('renders an OK step with a green check icon and the step name', () => {
    const out = formatStepHuman(step({ status: 'ok' }));
    expect(out).toContain('DNS Resolution');
    // Picocolors writes escape sequences around the check char in TTY
    expect(out).toContain('✓');
  });

  it('renders an error step with a red cross icon', () => {
    const out = formatStepHuman(step({ status: 'error' }));
    expect(out).toContain('✗');
  });

  it('renders a skipped step with a dim circle icon', () => {
    const out = formatStepHuman(step({ status: 'skipped' }));
    expect(out).toContain('○');
  });

  it('renders latency when provided', () => {
    const out = formatStepHuman(step({ latencyMs: 42 }));
    expect(out).toContain('(42ms)');
  });

  it('renders message after an arrow when provided', () => {
    const out = formatStepHuman(step({ message: 'resolved' }));
    expect(out).toContain('→ resolved');
  });

  it('combines latency and message', () => {
    const out = formatStepHuman(step({ latencyMs: 10, message: 'resolved to 1.2.3.4' }));
    expect(out).toContain('(10ms)');
    expect(out).toContain('→ resolved to 1.2.3.4');
  });
});
