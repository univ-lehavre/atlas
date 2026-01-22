# Interface: DiagnosticStep

Defined in: [types.ts:91](https://github.com/univ-lehavre/atlas/blob/55f9855a424232d94722e95c6c935e435b5354ad/packages/net/src/types.ts#L91)

Result of a single diagnostic step.

## Properties

### latencyMs?

> `readonly` `optional` **latencyMs**: `number`

Defined in: [types.ts:97](https://github.com/univ-lehavre/atlas/blob/55f9855a424232d94722e95c6c935e435b5354ad/packages/net/src/types.ts#L97)

Time taken in milliseconds (optional)

---

### message?

> `readonly` `optional` **message**: `string`

Defined in: [types.ts:99](https://github.com/univ-lehavre/atlas/blob/55f9855a424232d94722e95c6c935e435b5354ad/packages/net/src/types.ts#L99)

Additional information (e.g., resolved IP, error message)

---

### name

> `readonly` **name**: `string`

Defined in: [types.ts:93](https://github.com/univ-lehavre/atlas/blob/55f9855a424232d94722e95c6c935e435b5354ad/packages/net/src/types.ts#L93)

Name of the diagnostic step (e.g., 'DNS Resolve', 'TCP Connect')

---

### status

> `readonly` **status**: [`DiagnosticStatus`](../type-aliases/DiagnosticStatus.md)

Defined in: [types.ts:95](https://github.com/univ-lehavre/atlas/blob/55f9855a424232d94722e95c6c935e435b5354ad/packages/net/src/types.ts#L95)

Status of the step
