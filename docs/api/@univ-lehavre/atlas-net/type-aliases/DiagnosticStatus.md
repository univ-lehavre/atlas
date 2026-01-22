# Type Alias: DiagnosticStatus

> **DiagnosticStatus** = `"ok"` \| `"error"` \| `"skipped"`

Defined in: [types.ts:17](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/net/src/types.ts#L17)

Status of a diagnostic step.

- `ok`: The check passed successfully
- `error`: The check failed
- `skipped`: The check was skipped (e.g., TLS check on non-HTTPS URL)
