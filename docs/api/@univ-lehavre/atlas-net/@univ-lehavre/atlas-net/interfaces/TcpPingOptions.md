# Interface: TcpPingOptions

Defined in: [types.ts:115](https://github.com/univ-lehavre/atlas/blob/48acc16c89a79209d3be1763a73e3e9607aa38aa/packages/net/src/types.ts#L115)

Options for TCP ping operation.

## Properties

### name?

> `readonly` `optional` **name**: `string`

Defined in: [types.ts:117](https://github.com/univ-lehavre/atlas/blob/48acc16c89a79209d3be1763a73e3e9607aa38aa/packages/net/src/types.ts#L117)

Custom name for the diagnostic step (default: 'TCP Connect')

***

### timeoutMs?

> `readonly` `optional` **timeoutMs**: [`TimeoutMs`](../type-aliases/TimeoutMs.md)

Defined in: [types.ts:119](https://github.com/univ-lehavre/atlas/blob/48acc16c89a79209d3be1763a73e3e9607aa38aa/packages/net/src/types.ts#L119)

Connection timeout in milliseconds (default: 3000)
