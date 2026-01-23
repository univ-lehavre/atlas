/**
 * Terminal output utilities for CLI applications.
 *
 * Provides context-aware logging that adapts to human, CI, and JSON output modes.
 * Integrates with @clack/prompts for interactive elements.
 *
 * @module
 */

import * as p from '@clack/prompts';
import pc from 'picocolors';
import type { CliContext } from './context.js';

/**
 * Step status for progress indicators.
 */
export type StepStatus = 'ok' | 'error' | 'pending' | 'skipped';

/**
 * Formats a step for human-readable output.
 */
const formatStepHuman = (name: string, status: StepStatus, latencyMs?: number): string => {
  const icons: Record<StepStatus, string> = {
    ok: pc.green('\u2713'),
    error: pc.red('\u2717'),
    pending: pc.yellow('\u2026'),
    skipped: pc.dim('\u25CB'),
  };
  const icon = icons[status];
  const latency = latencyMs !== undefined ? pc.dim(` (${String(latencyMs)}ms)`) : '';
  return `  ${icon} ${name}${latency}`;
};

/**
 * Formats a step for CI output.
 */
const formatStepCi = (name: string, status: StepStatus, latencyMs?: number): string => {
  const statusMap: Record<StepStatus, string> = {
    ok: 'OK',
    error: 'FAIL',
    pending: 'PEND',
    skipped: 'SKIP',
  };
  const statusStr = statusMap[status].padEnd(4);
  const latency = latencyMs !== undefined ? ` ${String(latencyMs)}ms` : '';
  return `[${statusStr}] ${name}${latency}`;
};

/**
 * Context-aware logging utilities.
 *
 * Adapts output based on the CLI context (human, CI, or JSON mode).
 *
 * @example
 * ```typescript
 * const ctx = createCliContext({ ci: false });
 *
 * log.info(ctx, 'Starting process...');
 * log.step(ctx, 'Connecting', 'ok', 123);
 * log.success(ctx, 'Done!');
 * ```
 */
export const log = {
  /**
   * Logs an informational message.
   */
  info: (ctx: CliContext, msg: string): void => {
    if (ctx.json || ctx.quiet) return;
    if (ctx.ci) {
      console.log(`[INFO] ${msg}`);
    } else {
      p.log.info(msg);
    }
  },

  /**
   * Logs a success message.
   */
  success: (ctx: CliContext, msg: string): void => {
    if (ctx.json || ctx.quiet) return;
    if (ctx.ci) {
      console.log(`[OK] ${msg}`);
    } else {
      p.log.success(msg);
    }
  },

  /**
   * Logs an error message.
   */
  error: (ctx: CliContext, msg: string): void => {
    if (ctx.json) return;
    if (ctx.ci) {
      console.error(`[ERROR] ${msg}`);
    } else {
      p.log.error(msg);
    }
  },

  /**
   * Logs a warning message.
   */
  warn: (ctx: CliContext, msg: string): void => {
    if (ctx.json || ctx.quiet) return;
    if (ctx.ci) {
      console.warn(`[WARN] ${msg}`);
    } else {
      p.log.warn(msg);
    }
  },

  /**
   * Logs a step with status indicator.
   */
  step: (ctx: CliContext, name: string, status: StepStatus, latencyMs?: number): void => {
    if (ctx.json) return;
    if (ctx.ci) {
      console.log(formatStepCi(name, status, latencyMs));
    } else {
      console.log(formatStepHuman(name, status, latencyMs));
    }
  },

  /**
   * Logs a message (only in verbose mode).
   */
  verbose: (ctx: CliContext, msg: string): void => {
    if (!ctx.verbose || ctx.json || ctx.quiet) return;
    if (ctx.ci) {
      console.log(`[DEBUG] ${msg}`);
    } else {
      console.log(pc.dim(`  ${msg}`));
    }
  },

  /**
   * Logs a message unconditionally (unless in JSON mode).
   */
  message: (ctx: CliContext, msg: string): void => {
    if (ctx.json) return;
    console.log(msg);
  },
};

/**
 * Creates a spinner that adapts to the output mode.
 *
 * In CI mode, returns a no-op spinner that just logs messages.
 *
 * @example
 * ```typescript
 * const s = spinner(ctx);
 * s.start('Loading...');
 * // ... do work ...
 * s.stop('Done');
 * ```
 */
export const spinner = (
  ctx: CliContext
): {
  start: (msg: string) => void;
  stop: (msg: string) => void;
  message: (msg: string) => void;
} => {
  if (ctx.ci || ctx.json) {
    return {
      start: (msg: string) => {
        if (!ctx.json) console.log(`[...] ${msg}`);
      },
      stop: (msg: string) => {
        if (!ctx.json) console.log(msg);
      },
      message: (msg: string) => {
        if (!ctx.json) console.log(`[...] ${msg}`);
      },
    };
  }

  const s = p.spinner();
  return {
    start: (msg: string) => s.start(msg),
    stop: (msg: string) => s.stop(msg),
    message: (msg: string) => s.message(msg),
  };
};

/**
 * Shows an intro banner (only in human mode).
 */
export const intro = (ctx: CliContext, title: string): void => {
  if (ctx.json || ctx.ci || ctx.quiet) return;
  p.intro(pc.cyan(title));
};

/**
 * Shows an outro message (only in human mode).
 */
export const outro = (ctx: CliContext, message: string): void => {
  if (ctx.json || ctx.ci || ctx.quiet) return;
  p.outro(pc.dim(message));
};

/**
 * Formats data as JSON.
 */
export const formatJson = (data: unknown): string => JSON.stringify(data, null, 2);

/**
 * Outputs JSON data (only in JSON mode).
 */
export const outputJson = (ctx: CliContext, data: unknown): void => {
  if (!ctx.json) return;
  console.log(formatJson(data));
};

/**
 * Prompts for text input (falls back to error in CI mode).
 *
 * @throws In CI mode if no default is provided
 */
export const promptText = async (
  ctx: CliContext,
  options: {
    readonly message: string;
    readonly placeholder?: string;
    readonly defaultValue?: string;
    readonly validate?: (value: string) => string | undefined;
  }
): Promise<string> => {
  if (ctx.ci) {
    if (options.defaultValue !== undefined) {
      return options.defaultValue;
    }
    throw new Error(`Interactive prompt not available in CI mode: ${options.message}`);
  }

  const result = await p.text({
    message: options.message,
    placeholder: options.placeholder,
    defaultValue: options.defaultValue,
    validate: options.validate,
  });

  if (p.isCancel(result)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  return result;
};

/**
 * Prompts for confirmation (falls back to default in CI mode).
 */
export const promptConfirm = async (
  ctx: CliContext,
  options: {
    readonly message: string;
    readonly defaultValue?: boolean;
  }
): Promise<boolean> => {
  if (ctx.ci) {
    return options.defaultValue ?? false;
  }

  const result = await p.confirm({
    message: options.message,
    initialValue: options.defaultValue,
  });

  if (p.isCancel(result)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  return result;
};

/**
 * Select option type.
 */
export interface SelectOption<T> {
  readonly value: T;
  readonly label: string;
  readonly hint?: string;
}

/**
 * Prompts for selection (falls back to first option in CI mode).
 */
export const promptSelect = async <T extends string>(
  ctx: CliContext,
  options: {
    readonly message: string;
    readonly options: readonly SelectOption<T>[];
    readonly defaultValue?: T;
  }
): Promise<T> => {
  if (ctx.ci) {
    const firstOption = options.options[0];
    return options.defaultValue ?? (firstOption !== undefined ? firstOption.value : ('' as T));
  }

  // @clack/prompts Option type is a complex conditional type, cast to any
  const selectOptions = options.options.map((o) => ({
    value: o.value,
    label: o.label,
    ...(o.hint !== undefined && { hint: o.hint }),
  }));

  const result = await p.select({
    message: options.message,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    options: selectOptions as any,
    initialValue: options.defaultValue,
  });

  if (p.isCancel(result)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  return result;
};

// Re-export picocolors for direct access

export { default as pc } from 'picocolors';
