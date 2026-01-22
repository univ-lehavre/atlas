[**@univ-lehavre/atlas-redcap-api**](../README.md)

---

[@univ-lehavre/atlas-redcap-api](../README.md) / RedcapConfig

# Interface: RedcapConfig

Defined in: [packages/redcap-api/src/types.ts:42](https://github.com/univ-lehavre/atlas/blob/efca797d113c12556abf22a7fdb97dae8aa62ade/packages/redcap-api/src/types.ts#L42)

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

Defined in: [packages/redcap-api/src/types.ts:46](https://github.com/univ-lehavre/atlas/blob/efca797d113c12556abf22a7fdb97dae8aa62ade/packages/redcap-api/src/types.ts#L46)

The API token for authentication

---

### url

> `readonly` **url**: [`RedcapUrl`](../type-aliases/RedcapUrl.md)

Defined in: [packages/redcap-api/src/types.ts:44](https://github.com/univ-lehavre/atlas/blob/efca797d113c12556abf22a7fdb97dae8aa62ade/packages/redcap-api/src/types.ts#L44)

The REDCap API endpoint URL
