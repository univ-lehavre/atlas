# Interface: DiagnosticResult

Defined in: [types.ts:105](https://github.com/univ-lehavre/atlas/blob/067e8421c3433ceb323de771c4474cc290439004/packages/net/src/types.ts#L105)

Aggregated result of multiple diagnostic steps.

## Properties

### overallStatus

> `readonly` **overallStatus**: `"ok"` \| `"error"` \| `"partial"`

Defined in: [types.ts:109](https://github.com/univ-lehavre/atlas/blob/067e8421c3433ceb323de771c4474cc290439004/packages/net/src/types.ts#L109)

Overall status: 'ok' if all passed, 'partial' if some passed, 'error' if all failed

***

### steps

> `readonly` **steps**: readonly [`DiagnosticStep`](DiagnosticStep.md)[]

Defined in: [types.ts:107](https://github.com/univ-lehavre/atlas/blob/067e8421c3433ceb323de771c4474cc290439004/packages/net/src/types.ts#L107)

Array of individual diagnostic steps
