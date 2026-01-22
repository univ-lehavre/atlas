# Class: RedcapNetworkError

Defined in: [packages/redcap-api/src/errors.ts:127](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/errors.ts#L127)

Network-level error during REDCap API communication.

Represents errors that occur at the network/transport layer before
receiving an HTTP response. This includes:

- DNS resolution failures
- Connection timeouts
- Network unreachable errors
- TLS/SSL handshake failures
- Fetch API errors

## Example

```typescript
import { Effect } from 'effect';
import { RedcapNetworkError } from '@univ-lehavre/atlas-redcap-api';

// Creating a network error
const error = new RedcapNetworkError({ cause: new Error('Connection timeout') });

// Handling network errors with retry
Effect.retry(
  myOperation,
  Schedule.exponential('1 second').pipe(
    Schedule.filter(() => true) // Only retry network errors
  )
);
```

## Extends

- `YieldableError`\<`this`\> & `object` & `Readonly`\<\{ `cause`: `unknown`; \}\>

## Constructors

### Constructor

> **new RedcapNetworkError**(`args`): `RedcapNetworkError`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Data.d.ts:610

#### Parameters

##### args

###### cause

`unknown`

The underlying error that caused the network failure (typically Error or TypeError)

#### Returns

`RedcapNetworkError`

#### Inherited from

`Data.TaggedError('RedcapNetworkError')<{ /** The underlying error that caused the network failure (typically Error or TypeError) */ readonly cause: unknown; }>.constructor`

## Properties

### cause

> **cause**: `unknown`

Defined in: node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2022.error.d.ts:26

The underlying error that caused the network failure

#### Inherited from

`Data.TaggedError('RedcapNetworkError').cause`
