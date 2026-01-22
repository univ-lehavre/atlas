/**
 * Terminal styling utilities for CLI output
 */

import pc from 'picocolors';

export const style = {
  reset: (text: string) => text,
  bold: pc.bold,
  dim: pc.dim,
  red: pc.red,
  green: pc.green,
  yellow: pc.yellow,
  blue: pc.blue,
  cyan: pc.cyan,
} as const;

export const icon = {
  info: pc.blue('ℹ'),
  success: pc.green('✔'),
  error: pc.red('✖'),
  warn: pc.yellow('⚠'),
  step: pc.cyan('→'),
} as const;

export const format = {
  info: (msg: string) => `${icon.info} ${msg}`,
  success: (msg: string) => `${icon.success} ${msg}`,
  error: (msg: string) => `${icon.error} ${msg}`,
  warn: (msg: string) => `${icon.warn} ${msg}`,
  step: (msg: string) => `${icon.step} ${pc.dim(msg)}`,
  title: (msg: string) => `\n${pc.bold(msg)}\n`,
} as const;
