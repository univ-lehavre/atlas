# Workspace Conventions

This page defines naming and layout conventions used across the monorepo.

## Directories

- `apps/*`: deployable frontends/services (always private)
- `packages/*`: reusable libraries
- `services/*`: deployable backend services
- `cli/*`: command-line applications
- `config/*`: shared configuration packages
- `sandbox/*`: local test/sandbox projects

## Naming Rules

- `apps/<name>` -> `package.json.name = @univ-lehavre/atlas-<name>`
- `cli/<name>` directories must **not** end with `-cli`
- CLI package names should end with `-cli` (exception: `@univ-lehavre/atlas-redcap-openapi`)
- If `repository.directory` is set, it must match the real workspace path

## Validation

Run the structure audit before opening a PR:

```bash
pnpm audit:structure
```
