[**@univ-lehavre/atlas-redcap-api**](../index.md)

---

[@univ-lehavre/atlas-redcap-api](../index.md) / RedcapError

# Type Alias: RedcapError

> **RedcapError** = [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)

Defined in: [packages/redcap-api/src/errors.ts:162](https://github.com/univ-lehavre/atlas/blob/9f020e0b970df818d41e1532805b25c2cea7c1b7/packages/redcap-api/src/errors.ts#L162)

Union type representing all possible REDCap API errors.

Use this type when you need to handle any error that can occur during
REDCap API operations. All client methods return Effects that can fail
with one or more of these error types.

## Example

```typescript
import { Effect, Match } from 'effect';
import type { RedcapError } from '@univ-lehavre/atlas-redcap-api';

// Type-safe error handling
const handleError = (error: RedcapError): string => {
  switch (error._tag) {
    case 'RedcapHttpError':
      return `HTTP ${error.status}: ${error.message}`;
    case 'RedcapApiError':
      return `API Error: ${error.message}`;
    case 'RedcapNetworkError':
      return `Network Error: ${String(error.cause)}`;
  }
};

// Using with Effect.catchAll
Effect.catchAll(myOperation, (error: RedcapError) => Effect.succeed(handleError(error)));
```
