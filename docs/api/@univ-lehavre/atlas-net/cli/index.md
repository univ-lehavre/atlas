# cli

Atlas Network Diagnostics CLI.

Performs network diagnostics including DNS resolution, TCP connectivity,
and TLS handshake tests.

## Example

```bash
# Interactive mode
atlas-net

# Diagnose specific URL
atlas-net https://example.com

# CI mode with JSON output
atlas-net --ci --json https://example.com
```

## Functions

| Function | Description |
| ------ | ------ |
| [main](functions/main.md) | Main entry point for the CLI. Called from bin/atlas-net.ts |
