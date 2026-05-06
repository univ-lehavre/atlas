import pc from 'picocolors';
import type { DiagnosticStep } from '@univ-lehavre/atlas-net';

export const formatStepHuman = (step: DiagnosticStep): string => {
  const icon =
    step.status === 'ok'
      ? pc.green('\u2713')
      : step.status === 'error'
        ? pc.red('\u2717')
        : pc.dim('\u25CB');
  const latency = step.latencyMs === undefined ? '' : pc.dim(` (${String(step.latencyMs)}ms)`);
  const message = step.message ? pc.dim(` \u2192 ${step.message}`) : '';
  return `${icon} ${step.name}${latency}${message}`;
};

export const formatStepCi = (step: DiagnosticStep): string => {
  const status = step.status.toUpperCase().padEnd(5);
  const latency = step.latencyMs === undefined ? '' : ` ${String(step.latencyMs)}ms`;
  const message = step.message ? ` - ${step.message}` : '';
  return `[${status}] ${step.name}${latency}${message}`;
};
