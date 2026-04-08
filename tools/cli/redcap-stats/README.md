# @univ-lehavre/atlas-redcap-stats-cli

CLI to quickly test REDCap HTTP responses project by project using `redcap-token.csv`.

## Installation (monorepo)

```bash
pnpm install
```

## Usage

### Test one project

```bash
pnpm --filter @univ-lehavre/atlas-redcap-stats-cli build
node tools/cli/redcap-stats/dist/bin/atlas-redcap-stats.js --project 25
```

### Test all projects

```bash
node tools/cli/redcap-stats/dist/bin/atlas-redcap-stats.js --all
```

## Options

- `--project <id>`: test a single `project_id`
- `--all`: test all projects from the CSV
- `--api-url <url>`: override REDCap API URL
- `--tokens-file <path>`: override CSV path (default: `redcap-token.csv`)
- `--content <name>`: REDCap content to test (default: `log`)
- `--timeout-ms <n>`: HTTP timeout in ms (default: `12000`)
- `--show-body`: display a response body preview
- `--json`: JSON output

## `REDCAP_API_URL` resolution

Priority order:

1. `--api-url`
2. `REDCAP_API_URL` environment variable
3. `apps/redcap-dashboard/.env`
4. root `.env`

## Example output

```text
[redcap] project 25: HTTP 403 Forbidden

Summary: {"403":1}
```
