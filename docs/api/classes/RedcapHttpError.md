# Class: RedcapHttpError

Defined in: [packages/redcap-api/src/errors.ts:58](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/errors.ts#L58)

HTTP-level error from REDCap API.

Represents errors where the HTTP response status code indicates a failure
(non-2xx status). This includes authentication failures (401, 403),
not found errors (404), rate limiting (429), and server errors (5xx).

## Example

```typescript
import { Effect } from 'effect';
import { RedcapHttpError } from '@univ-lehavre/atlas-redcap-api';

// Creating an HTTP error
const error = new RedcapHttpError({ status: 401, message: 'Invalid token' });

// Handling HTTP errors
Effect.catchTag('RedcapHttpError', (e) => {
  if (e.status === 401) {
    return Effect.fail('Authentication failed');
  }
  return Effect.fail(`HTTP error ${e.status}`);
});
```

## Extends

- `YieldableError`\<`this`\> & `object` & `Readonly`\<\{ `message`: `string`; `status`: `number`; \}\>

## Constructors

### Constructor

> **new RedcapHttpError**(`args`): `RedcapHttpError`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Data.d.ts:610

#### Parameters

##### args

###### message

`string`

The error message extracted from the response body

###### status

`number`

The HTTP status code of the failed response

#### Returns

`RedcapHttpError`

#### Inherited from

`Data.TaggedError('RedcapHttpError')<{ /** The HTTP status code of the failed response */ readonly status: number; /** The error message extracted from the response body */ readonly message: string; }>.constructor`

## Properties

### message

> **message**: `string`

Defined in: node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1077

The error message from the response body

#### Inherited from

`Data.TaggedError('RedcapHttpError').message`

---

### status

> `readonly` **status**: `number`

Defined in: [packages/redcap-api/src/errors.ts:60](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/errors.ts#L60)

The HTTP status code (e.g., 401, 403, 404, 500)

#### Inherited from

`Data.TaggedError('RedcapHttpError').status`
