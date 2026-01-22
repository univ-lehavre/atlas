# @univ-lehavre/atlas-redcap-cli

CLI tool for testing REDCap connectivity and exploring projects.

## Installation

```bash
pnpm add @univ-lehavre/atlas-redcap-cli
```

## Usage

```bash
# Show help
redcap --help

# Run all connectivity tests
redcap test --url http://localhost:3000

# Quick check (service + health only)
redcap test --quick

# JSON output for CI integration
redcap test --json

# Individual tests
redcap test --service      # Check service connectivity
redcap test --health       # Check REDCap server and token
redcap test --project      # Show project information
redcap test --instruments  # List available instruments
redcap test --fields       # List available fields
redcap test --records      # Fetch sample records
```

## Architecture

```
src/
├── bin.ts          # Entry point, Layer composition
├── cli.ts          # Root command and subcommand registration
├── commands/
│   ├── index.ts    # Command exports
│   └── test.ts     # Test command implementation
├── services.ts     # HTTP service layer (RedcapService)
├── terminal.ts     # ANSI styling utilities
└── index.ts        # Public API exports
```

### Key Components

#### `bin.ts` - Entry Point

Composes Effect Layers and runs the CLI:

```typescript
const ConfigLayer = Layer.succeed(RedcapServiceConfigTag, { baseUrl });
const HttpLayer = NodeHttpClient.layer;
const ServiceLayer = Layer.provide(RedcapServiceLive, Layer.merge(ConfigLayer, HttpLayer));

yield * runCli(args).pipe(Effect.provide(ServiceLayer), Effect.provide(NodeContext.layer));
```

#### `services.ts` - HTTP Layer

Defines the `RedcapService` Context.Tag with three methods:

- `checkService()` - Quick ping to `/health`
- `getHealth()` - Detailed health check from `/health/detailed`
- `getRecords()` - Fetch sample records from `/api/v1/records`

Uses Effect's `Schema` for response validation.

#### `commands/test.ts` - Test Command

Implements the test command with two output modes:

- **Normal output** - Colored terminal output with progress indicators
- **JSON output** - Structured JSON for CI pipelines

### Adding a New Command

1. Create `src/commands/your-command.ts`:

```typescript
import { Command, Options } from '@effect/cli';
import { Effect } from 'effect';

const someOption = Options.boolean('option').pipe(
  Options.withDescription('Description'),
  Options.withAlias('o')
);

export const yourCommand = Command.make('your-command', { option: someOption }, (config) =>
  Effect.gen(function* () {
    // Implementation
  })
);
```

2. Export from `src/commands/index.ts`:

```typescript
export { yourCommand } from './your-command.js';
```

3. Register in `src/cli.ts`:

```typescript
import { testCommand, yourCommand } from './commands/index.js';

export const cli = rootCommand.pipe(Command.withSubcommands([testCommand, yourCommand]));
```

### Terminal Styling

Use the `terminal.ts` utilities for consistent output:

```typescript
import { format, style, icon } from '../terminal.js';

// Formatted messages
Console.log(format.success('Operation completed'));
Console.log(format.error('Something went wrong'));
Console.log(format.info('Information'));
Console.log(format.warn('Warning'));
Console.log(format.step('Processing...'));
Console.log(format.title('Section Title'));

// Direct styling
Console.log(style.bold('Bold text'));
Console.log(style.dim('Dimmed text'));
Console.log(style.green('Green text'));

// Icons
Console.log(`${icon.success} Done`);
```

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm typecheck
```

## Integration with redcap-service

The CLI is available as a dev dependency in `apps/redcap-service`:

```bash
cd apps/redcap-service

# Run with default URL
pnpm redcap test

# Run with custom URL
pnpm redcap:test  # Uses http://localhost:3000
```
