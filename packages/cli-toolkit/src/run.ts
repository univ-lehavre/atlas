/**
 * Fatal-error / exit-code handling shared by the atlas CLI bin entry points.
 *
 * Each `bin/atlas-*.ts` re-implemented the same `main().catch(... exit(1))`
 * pattern; this centralises it so the failure message and exit code stay
 * consistent across CLIs.
 *
 * Terminal rendering (clearing the screen, colours, prompts) is intentionally
 * left to the CLIs: `packages/` must stay side-effect free.
 */

/** Custom failure reporter; receives the rejected value from `main`. */
export type ErrorReporter = (error: unknown) => void;

/** Options for {@link runMain}. */
export interface RunMainOptions {
  /** Exit code used when `main` rejects (default `1`). */
  readonly exitCode?: number;
  /**
   * Custom failure reporter. Defaults to `console.error("Fatal error:", error)`.
   * Provide your own to route the message through a CLI logger.
   */
  readonly onError?: ErrorReporter;
}

/**
 * Runs an async CLI `main`, reporting any rejection and exiting the process
 * with a non-zero code. Resolves silently on success (the process exits
 * normally once the event loop drains).
 *
 * @param main - The CLI entry function.
 * @param options - Exit code and error reporter overrides.
 */
export const runMain = (main: () => Promise<void>, options: RunMainOptions = {}): void => {
  const { exitCode = 1, onError } = options;
  main().catch((error: unknown) => {
    if (onError) {
      onError(error);
    } else {
      console.error('Fatal error:', error);
    }
    process.exit(exitCode);
  });
};
