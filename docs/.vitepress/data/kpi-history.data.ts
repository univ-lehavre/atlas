/**
 * VitePress data loader for the coverage history series.
 *
 * Reads the committed, append-only `kpi-history.json` (class B of ADR 0032:
 * test coverage is measured by execution, so it is historised as a daily
 * snapshot series rather than diff-checked). The file is populated on `main`
 * by the scheduled `kpi-snapshot` workflow; it may be empty until the first
 * run, in which case the consuming component shows an empty state.
 *
 * @module
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** One daily coverage snapshot. */
export interface CoverageSnapshot {
  date: string;
  statements: number;
  branches: number;
  functions: number;
  lines: number;
  packages: number;
}

declare const data: CoverageSnapshot[];
export { data };

export default {
  watch: ["./kpi-history.json"],
  load(): CoverageSnapshot[] {
    const file = resolve(__dirname, "kpi-history.json");
    if (!existsSync(file)) return [];
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8"));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
};
