# Type Alias: DiagnosticStatus

> **DiagnosticStatus** = `"ok"` \| `"error"` \| `"skipped"`

Defined in: [types.ts:86](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/net/src/types.ts#L86)

Status of a diagnostic step.

- `ok`: The check passed successfully
- `error`: The check failed
- `skipped`: The check was skipped (e.g., TLS check on non-HTTPS URL)
