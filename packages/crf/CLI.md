# CRF CLI Tools

This package provides two CLI tools for interacting with REDCap:

- **crf-redcap** - Test REDCap API connectivity
- **crf-server** - Start the CRF HTTP microservice

## Installation

```bash
pnpm add @univ-lehavre/atlas-crf
```

Or run directly with npx:

```bash
npx crf-redcap --help
npx crf-server --help
```

---

## crf-redcap

Tests connectivity to a REDCap instance by running a series of API calls.

### Usage

```bash
crf-redcap [options]
```

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--url <url>` | `-u` | REDCap API URL | `$REDCAP_API_URL` or `http://localhost:8080/api` |
| `--token <token>` | `-t` | REDCap API token | `$REDCAP_API_TOKEN` |
| `--ci` | `-c` | CI mode (no colors, no prompts) | Auto-detected |
| `--json` | `-j` | Output results as JSON | `false` |
| `--verbose` | | Enable verbose output | `false` |
| `--quiet` | `-q` | Suppress non-essential output | `false` |
| `--help` | `-h` | Show help | |
| `--version` | | Show version | |

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REDCAP_API_URL` | REDCap API URL | No (has default) |
| `REDCAP_API_TOKEN` | REDCap API token | Yes |

### Exit Codes

| Code | Description |
|------|-------------|
| 0 | All tests passed |
| 1 | Some tests failed |
| 2 | Invalid configuration |

### Examples

```bash
# Using environment variables
export REDCAP_API_URL=https://redcap.example.com/api
export REDCAP_API_TOKEN=your-api-token
crf-redcap

# Override with flags
crf-redcap --url https://other.com/api --token your-token

# CI mode with JSON output
crf-redcap --ci --json

# Generate shell completions
crf-redcap --completions bash > ~/.bash_completion.d/crf-redcap
```

### Tests Performed

1. **Version** - Tests basic API connectivity
2. **Project Info** - Tests project access
3. **Instruments** - Tests instrument metadata access
4. **Fields** - Tests field metadata access
5. **Records** - Tests data export access

---

## crf-server

Starts the CRF HTTP microservice that exposes a REST API for REDCap operations.

### Usage

```bash
crf-server [options]
```

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--port <number>` | `-p` | Port to listen on | `$PORT` or `3000` |
| `--host <host>` | `-H` | Host to bind to | `$HOST` or `0.0.0.0` |
| `--no-rate-limit` | | Disable rate limiting | `$DISABLE_RATE_LIMIT` or `false` |
| `--ci` | `-c` | CI mode (minimal output) | Auto-detected |
| `--quiet` | `-q` | Suppress startup messages | `false` |
| `--help` | `-h` | Show help | |
| `--version` | | Show version | |

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REDCAP_API_URL` | REDCap API URL | Yes |
| `REDCAP_API_TOKEN` | REDCap API token | Yes |
| `PORT` | Server port | No (default: 3000) |
| `HOST` | Server host | No (default: 0.0.0.0) |
| `DISABLE_RATE_LIMIT` | Disable rate limiting | No (default: false) |

### Exit Codes

| Code | Description |
|------|-------------|
| 0 | Server stopped gracefully |
| 1 | General error |
| 2 | Invalid configuration |

### Examples

```bash
# Using environment variables
export REDCAP_API_URL=https://redcap.example.com/api
export REDCAP_API_TOKEN=your-api-token
crf-server

# Override port
crf-server --port 8080

# Disable rate limiting (for testing)
crf-server --no-rate-limit

# Using .env file
node --env-file=.env dist/bin/crf-server.js
```

### Endpoints

Once running, the server exposes:

| Endpoint | Description |
|----------|-------------|
| `/health` | Health check endpoints |
| `/api/v1/project/*` | REDCap project metadata |
| `/api/v1/records/*` | REDCap records management |
| `/api/v1/users/*` | REDCap users lookup |
| `/docs` | Scalar API documentation UI |
| `/openapi.json` | OpenAPI specification |

---

## CI/CD Integration

Both CLI tools support CI mode with:

- **Auto-detection** of CI environments (GitHub Actions, GitLab CI, Jenkins, etc.)
- **Plain text output** without colors or interactive prompts
- **JSON output** for machine parsing
- **Exit codes** for pipeline status

### GitHub Actions Example

```yaml
- name: Test REDCap connectivity
  run: |
    npx crf-redcap --ci --json > results.json
  env:
    REDCAP_API_URL: ${{ secrets.REDCAP_API_URL }}
    REDCAP_API_TOKEN: ${{ secrets.REDCAP_API_TOKEN }}
```

---

## Shell Completions

Generate shell completions with:

```bash
# Bash
crf-redcap --completions bash > ~/.bash_completion.d/crf-redcap
crf-server --completions bash > ~/.bash_completion.d/crf-server

# Zsh
crf-redcap --completions zsh > ~/.zfunc/_crf-redcap
crf-server --completions zsh > ~/.zfunc/_crf-server

# Fish
crf-redcap --completions fish > ~/.config/fish/completions/crf-redcap.fish
crf-server --completions fish > ~/.config/fish/completions/crf-server.fish
```
