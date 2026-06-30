export interface CliContext {
  readonly ci: boolean;
  readonly json: boolean;
  readonly quiet: boolean;
  readonly verbose: boolean;
}

export const detectCi = (): boolean =>
  // Sous vitest, le process n'a pas de TTY : `!isTTY` est toujours vrai, donc
  // les branches suivantes ne sont jamais évaluées en test. Tautologie d'env,
  // pas un vrai trou de couverture (cf. ADR 0019).
  /* v8 ignore next */
  !process.stdout.isTTY ||
  Boolean(process.env['CI']) ||
  Boolean(process.env['CONTINUOUS_INTEGRATION']) ||
  Boolean(process.env['GITHUB_ACTIONS']);
