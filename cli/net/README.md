# @univ-lehavre/atlas-net-cli

CLI tool for network diagnostics, useful for debugging connectivity issues.

## Installation

```bash
pnpm add @univ-lehavre/atlas-net-cli
```

## Usage

### Interactive Mode (default)

```bash
atlas-net
```

Prompts for a URL and runs diagnostics with visual feedback:

```
◆  Atlas Network Diagnostics

◆  Enter target URL to diagnose
│  https://example.com

✓ DNS Resolution (12ms) → 93.184.216.34
✓ TCP Connect (45ms)
✓ TLS Handshake (89ms) → example.com

◆  Done
```

### Direct URL

```bash
atlas-net https://example.com
```

### CI Mode

```bash
# Non-interactive output, exit code indicates success/failure
atlas-net --ci https://example.com
```

Output in CI mode:

```
[OK   ] DNS Resolution 12ms - 93.184.216.34
[OK   ] TCP Connect 45ms
[OK   ] TLS Handshake 89ms - example.com
```

### Options

```
-c, --ci     CI mode (no interactive prompts, plain output)
-h, --help   Show help message
```

## Diagnostic Steps

The tool runs the following checks in sequence:

1. **DNS Resolution** - Resolves the hostname to an IP address
2. **TCP Connect** - Verifies the port is open and reachable
3. **TLS Handshake** - (HTTPS only) Validates SSL/TLS certificate

If a step fails, the tool automatically runs an **Internet Check** to determine if the issue is local connectivity.

## Exit Codes

- `0`: All diagnostics passed
- `1`: One or more diagnostics failed

## License

MIT
