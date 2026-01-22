# Interface: DiagnosticResult

Defined in: [types.ts:36](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/net/src/types.ts#L36)

Aggregated result of multiple diagnostic steps.

## Properties

### overallStatus

> `readonly` **overallStatus**: `"ok"` \| `"error"` \| `"partial"`

Defined in: [types.ts:40](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/net/src/types.ts#L40)

Overall status: 'ok' if all passed, 'partial' if some passed, 'error' if all failed

---

### steps

> `readonly` **steps**: readonly [`DiagnosticStep`](DiagnosticStep.md)[]

Defined in: [types.ts:38](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/net/src/types.ts#L38)

Array of individual diagnostic steps
