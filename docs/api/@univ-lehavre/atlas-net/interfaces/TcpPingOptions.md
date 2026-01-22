# Interface: TcpPingOptions

Defined in: [types.ts:115](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/net/src/types.ts#L115)

Options for TCP ping operation.

## Properties

### name?

> `readonly` `optional` **name**: `string`

Defined in: [types.ts:117](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/net/src/types.ts#L117)

Custom name for the diagnostic step (default: 'TCP Connect')

---

### timeoutMs?

> `readonly` `optional` **timeoutMs**: [`TimeoutMs`](../type-aliases/TimeoutMs.md)

Defined in: [types.ts:119](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/net/src/types.ts#L119)

Connection timeout in milliseconds (default: 3000)
