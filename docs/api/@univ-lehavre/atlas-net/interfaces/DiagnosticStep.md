# Interface: DiagnosticStep

Defined in: [types.ts:22](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/net/src/types.ts#L22)

Result of a single diagnostic step.

## Properties

### latencyMs?

> `readonly` `optional` **latencyMs**: `number`

Defined in: [types.ts:28](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/net/src/types.ts#L28)

Time taken in milliseconds (optional)

---

### message?

> `readonly` `optional` **message**: `string`

Defined in: [types.ts:30](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/net/src/types.ts#L30)

Additional information (e.g., resolved IP, error message)

---

### name

> `readonly` **name**: `string`

Defined in: [types.ts:24](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/net/src/types.ts#L24)

Name of the diagnostic step (e.g., 'DNS Resolve', 'TCP Connect')

---

### status

> `readonly` **status**: [`DiagnosticStatus`](../type-aliases/DiagnosticStatus.md)

Defined in: [types.ts:26](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/net/src/types.ts#L26)

Status of the step
