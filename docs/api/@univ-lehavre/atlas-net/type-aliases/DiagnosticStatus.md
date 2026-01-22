# Type Alias: DiagnosticStatus

> **DiagnosticStatus** = `"ok"` \| `"error"` \| `"skipped"`

Defined in: [types.ts:86](https://github.com/univ-lehavre/atlas/blob/55f9855a424232d94722e95c6c935e435b5354ad/packages/net/src/types.ts#L86)

Status of a diagnostic step.

- `ok`: The check passed successfully
- `error`: The check failed
- `skipped`: The check was skipped (e.g., TLS check on non-HTTPS URL)
