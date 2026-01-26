# Interface: TlsHandshakeOptions

Defined in: [types.ts:125](https://github.com/univ-lehavre/atlas/blob/067e8421c3433ceb323de771c4474cc290439004/packages/net/src/types.ts#L125)

Options for TLS handshake operation.

## Properties

### rejectUnauthorized?

> `readonly` `optional` **rejectUnauthorized**: `boolean`

Defined in: [types.ts:129](https://github.com/univ-lehavre/atlas/blob/067e8421c3433ceb323de771c4474cc290439004/packages/net/src/types.ts#L129)

Whether to reject unauthorized certificates (default: true)

***

### timeoutMs?

> `readonly` `optional` **timeoutMs**: [`TimeoutMs`](../type-aliases/TimeoutMs.md)

Defined in: [types.ts:127](https://github.com/univ-lehavre/atlas/blob/067e8421c3433ceb323de771c4474cc290439004/packages/net/src/types.ts#L127)

Handshake timeout in milliseconds (default: 5000)
