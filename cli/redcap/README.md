# @univ-lehavre/atlas-redcap-cli

CLI tool for testing REDCap connectivity and exploring projects.

## Installation

```bash
pnpm add @univ-lehavre/atlas-redcap-cli
```

## Usage

### Interactive Mode (default)

```bash
redcap
```

Launches an interactive menu:

```
🔬 REDCap CLI

Service URL: http://localhost:3000

  1. Check service connectivity
  2. Health check (REDCap + token)
  3. Show project info
  4. List instruments
  5. List fields
  6. Fetch sample records
  7. Run all tests
  0. Exit

>
```

### CI Mode

```bash
# Run all tests (non-interactive)
redcap --ci

# JSON output for CI pipelines
redcap --ci --json

# Custom service URL
redcap --url http://localhost:3000 --ci
```

### Options

```
-u, --url <url>    Service base URL (default: http://localhost:3000)
--ci               Run in CI mode (non-interactive)
-j, --json         Output results as JSON (CI mode only)
-h, --help         Show help
```

## Architecture

```
src/
├── bin.ts          # Entry point, argument parsing, Layer composition
├── menu.ts         # Interactive menu (default mode)
├── ci.ts           # CI mode runner
├── services.ts     # HTTP service layer (RedcapService)
├── terminal.ts     # ANSI styling utilities
└── index.ts        # Public API exports
```

### Key Components

#### `bin.ts` - Entry Point

Parses arguments and routes to interactive or CI mode:

```typescript
const program = ciMode ? runCiMode(jsonOutput) : runInteractiveMenu(baseUrl);
yield * program.pipe(Effect.provide(ServiceLayer));
```

#### `menu.ts` - Interactive Menu

Displays a numbered menu and handles user input. Each action runs, then waits for a key press before returning to the menu.

#### `ci.ts` - CI Mode

Runs all tests sequentially and outputs results. Supports JSON output for pipeline integration.

#### `services.ts` - HTTP Layer

Defines the `RedcapService` Context.Tag with three methods:

- `checkService()` - Quick ping to `/health`
- `getHealth()` - Detailed health check from `/health/detailed`
- `getRecords()` - Fetch sample records from `/api/v1/records`

Uses Effect's `Schema` for response validation.

### Terminal Styling

Use the `terminal.ts` utilities for consistent output:

```typescript
import { format, style, icon } from './terminal.js';

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

The CLI is available as a dev dependency in `services/redcap`:

```bash
cd services/redcap

# Interactive mode
pnpm redcap

# CI mode
pnpm redcap --ci
```
