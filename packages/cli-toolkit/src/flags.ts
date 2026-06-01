/**
 * Minimal argv flag parsing shared by the atlas CLIs.
 *
 * These helpers replace the ad-hoc `args.includes(...)`, `args.indexOf(...)`
 * and "unknown flag" filtering each command re-implemented by hand. They are
 * intentionally tiny and dependency-free (no `yargs`): CLIs in `packages/`
 * must not pull in heavyweight argument parsers.
 */

/**
 * Whether a boolean flag is present in `args`.
 *
 * @param args - Argument list (already sliced, e.g. `process.argv.slice(2)`).
 * @param names - Flag and its aliases (e.g. `["--batch", "--yes"]`).
 */
export const hasFlag = (args: readonly string[], ...names: readonly string[]): boolean =>
  args.some((a) => names.includes(a));

/**
 * Returns the value following `name` (i.e. `--threshold 0.3` → `"0.3"`), or
 * `undefined` when the flag is absent. When the flag is present but has no
 * following token, `undefined` is returned as well.
 *
 * @param args - Argument list.
 * @param name - Flag whose value to read (e.g. `"--threshold"`).
 */
export const getFlagValue = (args: readonly string[], name: string): string | undefined => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
};

/** Options for {@link findUnknownFlags}. */
export interface FindUnknownFlagsOptions {
  /** Boolean flags accepted by the command (e.g. `["--batch", "--yes"]`). */
  readonly booleanFlags?: readonly string[];
  /** Value flags accepted by the command (e.g. `["--threshold", "--top"]`). */
  readonly valueFlags?: readonly string[];
}

/**
 * Lists arguments that are neither a known flag nor the value consumed by a
 * known value-flag. Use it to reject typos: an empty result means every
 * argument was recognised.
 *
 * @example
 * findUnknownFlags(["--threshold", "0.3", "--oops"], { valueFlags: ["--threshold"] })
 * // → ["--oops"]
 */
export const findUnknownFlags = (
  args: readonly string[],
  { booleanFlags = [], valueFlags = [] }: FindUnknownFlagsOptions = {}
): readonly string[] => {
  const unknown: string[] = [];
  for (const [i, arg] of args.entries()) {
    if (booleanFlags.includes(arg) || valueFlags.includes(arg)) continue;
    // A token consumed as the value of a preceding value-flag is not unknown.
    const previous = i > 0 ? args[i - 1] : undefined;
    if (previous !== undefined && valueFlags.includes(previous)) continue;
    unknown.push(arg);
  }
  return unknown;
};
