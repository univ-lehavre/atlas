# Type Alias: DiagnosticStatus

> **DiagnosticStatus** = `"ok"` \| `"error"` \| `"skipped"`

Defined in: [types.ts:86](https://github.com/univ-lehavre/atlas/blob/067e8421c3433ceb323de771c4474cc290439004/packages/net/src/types.ts#L86)

Status of a diagnostic step.

- `ok`: The check passed successfully
- `error`: The check failed
- `skipped`: The check was skipped (e.g., TLS check on non-HTTPS URL)
