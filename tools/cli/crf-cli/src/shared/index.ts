/**
 * Shared CLI utilities.
 *
 * @module
 */

export {
  type CliContext,
  type OutputMode,
  createCliContext,
  detectCi,
  ExitCode,
} from './context.js';

export type { ExitCode as ExitCodeType } from './context.js';

export { type StepStatus, log, intro, outro, outputJson, pc } from './terminal.js';
