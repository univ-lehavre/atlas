/**
 * Terminal styling utilities for CLI output
 */

// ANSI color codes
const codes = {
  reset: '\u001B[0m',
  bold: '\u001B[1m',
  dim: '\u001B[2m',
  red: '\u001B[31m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  blue: '\u001B[34m',
  cyan: '\u001B[36m',
} as const;

export const style = {
  reset: (text: string) => `${codes.reset}${text}`,
  bold: (text: string) => `${codes.bold}${text}${codes.reset}`,
  dim: (text: string) => `${codes.dim}${text}${codes.reset}`,
  red: (text: string) => `${codes.red}${text}${codes.reset}`,
  green: (text: string) => `${codes.green}${text}${codes.reset}`,
  yellow: (text: string) => `${codes.yellow}${text}${codes.reset}`,
  blue: (text: string) => `${codes.blue}${text}${codes.reset}`,
  cyan: (text: string) => `${codes.cyan}${text}${codes.reset}`,
} as const;

export const icon = {
  info: `${codes.blue}ℹ${codes.reset}`,
  success: `${codes.green}✔${codes.reset}`,
  error: `${codes.red}✖${codes.reset}`,
  warn: `${codes.yellow}⚠${codes.reset}`,
  step: `${codes.cyan}→${codes.reset}`,
} as const;

export const format = {
  info: (msg: string) => `${icon.info} ${msg}`,
  success: (msg: string) => `${icon.success} ${msg}`,
  error: (msg: string) => `${icon.error} ${msg}`,
  warn: (msg: string) => `${icon.warn} ${msg}`,
  step: (msg: string) => `${icon.step} ${style.dim(msg)}`,
  title: (msg: string) => `\n${style.bold(msg)}\n`,
} as const;
