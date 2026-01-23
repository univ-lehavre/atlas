# Atlas Net CLI

Network diagnostics CLI for testing connectivity to remote services.

## Installation

```bash
pnpm add @univ-lehavre/atlas-net
```

Or run directly with npx:

```bash
npx atlas-net --help
```

---

## Usage

```bash
atlas-net [options] [url]
```

### Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `url` | Target URL to diagnose | No (interactive prompt if omitted) |

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--ci` | `-c` | CI mode (no colors, no prompts) | Auto-detected |
| `--json` | `-j` | Output results as JSON | `false` |
| `--verbose` | `-v` | Enable verbose output | `false` |
| `--quiet` | `-q` | Suppress non-essential output | `false` |
| `--help` | `-h` | Show help | |
| `--version` | | Show version | |

### Exit Codes

| Code | Description |
|------|-------------|
| 0 | All diagnostics passed |
| 1 | General error |
| 2 | Invalid configuration |
| 3 | Network connectivity failed |

---

## Diagnostics Performed

1. **DNS Resolution** - Resolves hostname to IP address
2. **TCP Connect** - Tests TCP connectivity to port
3. **TLS Handshake** - Verifies TLS/SSL certificate (HTTPS only)
4. **Internet Check** - Fallback check if DNS or TCP fails

---

## Examples

### Interactive Mode

```bash
atlas-net
# Prompts for URL input with validation
```

### Direct URL

```bash
atlas-net https://example.com
```

### CI Mode

```bash
atlas-net --ci https://api.example.com
# Output:
# [OK   ] DNS Resolution 12ms - 93.184.216.34
# [OK   ] TCP Connect 45ms
# [OK   ] TLS Handshake 89ms
```

### JSON Output

```bash
atlas-net --json https://example.com
```

Output:

```json
{
  "url": "https://example.com",
  "steps": [
    {
      "name": "DNS Resolution",
      "status": "ok",
      "latencyMs": 12,
      "message": "93.184.216.34"
    },
    {
      "name": "TCP Connect",
      "status": "ok",
      "latencyMs": 45
    },
    {
      "name": "TLS Handshake",
      "status": "ok",
      "latencyMs": 89
    }
  ],
  "success": true
}
```

---

## CI/CD Integration

The CLI supports CI mode with:

- **Auto-detection** of CI environments (GitHub Actions, GitLab CI, Jenkins, etc.)
- **Plain text output** without colors or interactive prompts
- **JSON output** for machine parsing
- **Exit codes** for pipeline status

### GitHub Actions Example

```yaml
- name: Check API connectivity
  run: |
    npx atlas-net --ci --json https://api.example.com > connectivity.json

- name: Verify result
  run: |
    jq -e '.success == true' connectivity.json
```

### Pre-deployment Check

```yaml
- name: Verify database connectivity
  run: |
    atlas-net --ci https://db.example.com:5432
  continue-on-error: false
```

---

## Programmatic Usage

```typescript
import { dnsResolve, tcpPing, tlsHandshake } from '@univ-lehavre/atlas-net';
import { Effect } from 'effect';
import { Hostname, Port } from '@univ-lehavre/atlas-net';

const hostname = Hostname('example.com');
const port = Port(443);

// DNS Resolution
const dnsResult = await Effect.runPromise(dnsResolve(hostname));
console.log(dnsResult);
// { name: 'DNS Resolution', status: 'ok', latencyMs: 12, message: '93.184.216.34' }

// TCP Ping
const tcpResult = await Effect.runPromise(tcpPing(hostname, port));
console.log(tcpResult);
// { name: 'TCP Connect', status: 'ok', latencyMs: 45 }

// TLS Handshake
const tlsResult = await Effect.runPromise(tlsHandshake(hostname, port));
console.log(tlsResult);
// { name: 'TLS Handshake', status: 'ok', latencyMs: 89 }
```

---

## Shell Completions

Generate shell completions with:

```bash
# Bash
atlas-net --completions bash > ~/.bash_completion.d/atlas-net

# Zsh
atlas-net --completions zsh > ~/.zfunc/_atlas-net

# Fish
atlas-net --completions fish > ~/.config/fish/completions/atlas-net.fish
```
