[**@univ-lehavre/atlas-redcap-api**](../index.md)

---

[@univ-lehavre/atlas-redcap-api](../index.md) / RedcapConfig

# Interface: RedcapConfig

Defined in: [packages/redcap-api/src/types.ts:42](https://github.com/univ-lehavre/atlas/blob/9f020e0b970df818d41e1532805b25c2cea7c1b7/packages/redcap-api/src/types.ts#L42)

Configuration for REDCap API client.

Contains the required credentials to connect to a REDCap instance.
Both values are branded types that enforce validation at runtime.

## Example

```typescript
import { RedcapUrl, RedcapToken } from '@univ-lehavre/atlas-redcap-api';
import type { RedcapConfig } from '@univ-lehavre/atlas-redcap-api';

const config: RedcapConfig = {
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('AABBCCDD11223344AABBCCDD11223344'),
};
```

## Properties

### token

> `readonly` **token**: [`RedcapToken`](../type-aliases/RedcapToken.md)

Defined in: [packages/redcap-api/src/types.ts:46](https://github.com/univ-lehavre/atlas/blob/9f020e0b970df818d41e1532805b25c2cea7c1b7/packages/redcap-api/src/types.ts#L46)

The API token for authentication

---

### url

> `readonly` **url**: [`RedcapUrl`](../type-aliases/RedcapUrl.md)

Defined in: [packages/redcap-api/src/types.ts:44](https://github.com/univ-lehavre/atlas/blob/9f020e0b970df818d41e1532805b25c2cea7c1b7/packages/redcap-api/src/types.ts#L44)

The REDCap API endpoint URL
