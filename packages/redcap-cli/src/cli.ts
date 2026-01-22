/**
 * REDCap CLI Application
 */

import { Command, Options } from '@effect/cli';
import { Console, Effect } from 'effect';
import { testCommand } from './commands/index.js';
import { format } from './terminal.js';

// ============================================================================
// Root Command Options
// ============================================================================

const urlOption = Options.text('url').pipe(
  Options.withAlias('u'),
  Options.withDescription('REDCap service base URL'),
  Options.withDefault('http://localhost:3000')
);

// ============================================================================
// Root Command
// ============================================================================

const rootCommand = Command.make('redcap', { url: urlOption }, ({ url }) =>
  Console.log(
    format.info(`REDCap CLI - Use 'redcap test' to run connectivity tests\n`) +
      format.info(`Service URL: ${url}`)
  )
);

// ============================================================================
// CLI with Subcommands
// ============================================================================

export const cli = rootCommand.pipe(Command.withSubcommands([testCommand]));

export const runCli = Command.run(cli, {
  name: 'REDCap CLI',
  version: '0.1.0',
});
