# Interface: TlsHandshakeOptions

Defined in: [types.ts:125](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/net/src/types.ts#L125)

Options for TLS handshake operation.

## Properties

### rejectUnauthorized?

> `readonly` `optional` **rejectUnauthorized**: `boolean`

Defined in: [types.ts:129](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/net/src/types.ts#L129)

Whether to reject unauthorized certificates (default: true)

---

### timeoutMs?

> `readonly` `optional` **timeoutMs**: [`TimeoutMs`](../type-aliases/TimeoutMs.md)

Defined in: [types.ts:127](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/net/src/types.ts#L127)

Handshake timeout in milliseconds (default: 5000)
