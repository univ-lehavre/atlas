import type { Period } from "@univ-lehavre/atlas-stats";

export interface CliOptions {
  readonly token: string | null;
  readonly period: Period | null;
  readonly force: boolean;
  readonly json: boolean;
  readonly help: boolean;
}

const PERIOD_VALUES: Period[] = ["day", "week", "month", "quarter"];

const isPeriod = (value: string): value is Period =>
  (PERIOD_VALUES as string[]).includes(value);

const fail = (message: string): never => {
  throw new Error(message);
};

export const parseArgs = (argv: readonly string[]): CliOptions => {
  let token: string | null = null;
  let period: Period | null = null;
  let force = false;
  let json = false;
  let help = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--token") {
      token = (argv[i + 1] ?? fail("Argument manquant pour --token")).trim();
      i += 1;
    } else if (arg === "--period") {
      const value = (argv[i + 1] ?? fail("Argument manquant pour --period")).trim();
      if (!isPeriod(value)) {
        fail(`Période invalide: ${value}. Valeurs: day, week, month, quarter`);
      }
      period = value as Period;
      i += 1;
    } else if (arg === "--force") {
      force = true;
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--help" || arg === "-h") {
      help = true;
    } else {
      fail(`Option inconnue: ${arg}`);
    }
  }

  return { token, period, force, json, help };
};

export const requireValue = <T>(value: T | null | undefined, message: string): T => {
  if (value === null || value === undefined) {
    fail(message);
  }
  return value as T;
};
