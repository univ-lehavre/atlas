# Class: RedcapApiError

Defined in: [packages/redcap-api/src/errors.ts:92](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/errors.ts#L92)

Application-level error from REDCap API.

Represents errors where REDCap returns a 200 OK HTTP response but includes
an error object in the JSON body. This is REDCap's way of indicating
application-level errors such as invalid parameters, permission issues,
or data validation failures.

REDCap returns these as: `{ "error": "Error message here" }`

## Example

```typescript
import { Effect } from 'effect';
import { RedcapApiError } from '@univ-lehavre/atlas-redcap-api';

// Creating an API error
const error = new RedcapApiError({ message: 'Invalid token' });

// Handling API errors
Effect.catchTag('RedcapApiError', (e) => {
  console.error('REDCap API error:', e.message);
  return Effect.fail('Operation failed');
});
```

## Extends

- `YieldableError`\<`this`\> & `object` & `Readonly`\<\{ `message`: `string`; \}\>

## Constructors

### Constructor

> **new RedcapApiError**(`args`): `RedcapApiError`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Data.d.ts:610

#### Parameters

##### args

###### message

`string`

The error message from REDCap's error response payload

#### Returns

`RedcapApiError`

#### Inherited from

`Data.TaggedError('RedcapApiError')<{ /** The error message from REDCap's error response payload */ readonly message: string; }>.constructor`

## Properties

### message

> **message**: `string`

Defined in: node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1077

The error message from REDCap's error response

#### Inherited from

`Data.TaggedError('RedcapApiError').message`
