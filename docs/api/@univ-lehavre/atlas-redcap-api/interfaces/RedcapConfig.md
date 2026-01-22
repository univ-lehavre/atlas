# Interface: RedcapConfig

Defined in: [packages/redcap-api/src/types.ts:453](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L453)

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

Defined in: [packages/redcap-api/src/types.ts:457](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L457)

The API token for authentication

---

### url

> `readonly` **url**: [`SafeApiUrl`](../../atlas-net/type-aliases/SafeApiUrl.md)

Defined in: [packages/redcap-api/src/types.ts:455](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L455)

The REDCap API endpoint URL
