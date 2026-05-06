export interface CliContext {
  readonly ci: boolean;
  readonly json: boolean;
  readonly quiet: boolean;
  readonly verbose: boolean;
}

export const detectCi = (): boolean =>
  !process.stdout.isTTY ||
  Boolean(process.env['CI']) ||
  Boolean(process.env['CONTINUOUS_INTEGRATION']) ||
  Boolean(process.env['GITHUB_ACTIONS']);
