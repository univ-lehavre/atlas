/**
 * Shared CLI utilities.
 *
 * @module
 */

export {
  type CliContext,
  type OutputMode,
  CliContextService,
  createCliContext,
  makeCliContextLayer,
  detectCi,
  resolveOutputMode,
  ExitCode,
} from './context.js';

export type { ExitCode as ExitCodeType } from './context.js';

export {
  type StepStatus,
  type SelectOption,
  log,
  spinner,
  intro,
  outro,
  formatJson,
  outputJson,
  promptText,
  promptConfirm,
  promptSelect,
  pc,
} from './terminal.js';
