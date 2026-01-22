# Interface: TlsHandshakeOptions

Defined in: [types.ts:56](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/net/src/types.ts#L56)

Options for TLS handshake operation.

## Properties

### rejectUnauthorized?

> `readonly` `optional` **rejectUnauthorized**: `boolean`

Defined in: [types.ts:60](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/net/src/types.ts#L60)

Whether to reject unauthorized certificates (default: true)

---

### timeoutMs?

> `readonly` `optional` **timeoutMs**: `number`

Defined in: [types.ts:58](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/net/src/types.ts#L58)

Handshake timeout in milliseconds (default: 5000)
