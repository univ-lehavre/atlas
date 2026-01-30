# CLI Tools

Atlas provides command line tools for testing connectivity and diagnosing issues.

## CRF REDCap CLI

Tool for testing direct connectivity with the REDCap API.

### Installation

```bash
pnpm add @univ-lehavre/crf
```

### Usage

```bash
# Test REDCap connectivity
crf-redcap test

# With custom URL and token
REDCAP_API_URL=https://redcap.example.com/api/ \
REDCAP_API_TOKEN=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA \
crf-redcap test

# JSON output
crf-redcap test --json
```

### Tests Performed

1. **Version** - Retrieves the REDCap version
2. **Project Info** - Project information
3. **Instruments** - List of forms
4. **Fields** - List of fields
5. **Records** - Export of a sample of records

### Options

| Option       | Description    |
| ------------ | -------------- |
| `--json`     | JSON output    |
| `-h, --help` | Display help   |

### Environment Variables

| Variable           | Description                        |
| ------------------ | ---------------------------------- |
| `REDCAP_API_URL`   | REDCap API URL                     |
| `REDCAP_API_TOKEN` | REDCap API token (32 hex chars)    |

## Network CLI

Tool for diagnosing network connectivity issues.

### Installation

```bash
pnpm add @univ-lehavre/atlas-net-cli
```

### Interactive Mode

```bash
atlas-net
```

Prompts for a URL and runs diagnostics:

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
atlas-net --ci https://example.com
```

Output:

```
[OK   ] DNS Resolution 12ms - 93.184.216.34
[OK   ] TCP Connect 45ms
[OK   ] TLS Handshake 89ms - example.com
```

### Options

| Option       | Description                          |
| ------------ | ------------------------------------ |
| `-c, --ci`   | CI mode (no prompts, simple output)  |
| `-h, --help` | Display help                         |

### Diagnostic Steps

1. **DNS Resolution** - Resolves hostname to IP address
2. **TCP Connect** - Verifies that the port is open and accessible
3. **TLS Handshake** - (HTTPS only) Validates SSL/TLS certificate

If a step fails, an **Internet Check** is automatically performed to determine if the problem is local.

### Exit Codes

- `0`: All diagnostics succeeded
- `1`: One or more diagnostics failed

## Integration with the CRF Package

CLIs are included in the `@univ-lehavre/crf` package:

```bash
# Test REDCap directly
pnpm -F @univ-lehavre/crf crf-redcap test

# Start REDCap mock (Prism)
pnpm -F @univ-lehavre/crf mock:redcap

# Start CRF server
pnpm -F @univ-lehavre/crf start
```
