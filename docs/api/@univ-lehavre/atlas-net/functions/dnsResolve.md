# Function: dnsResolve()

> **dnsResolve**(`hostname`): `Effect`\<[`DiagnosticStep`](../interfaces/DiagnosticStep.md)\>

Defined in: [diagnostics.ts:84](https://github.com/univ-lehavre/atlas/blob/55f9855a424232d94722e95c6c935e435b5354ad/packages/net/src/diagnostics.ts#L84)

Resolves a hostname to an IP address using DNS lookup.

This function wraps Node's `dns.lookup` in an Effect for functional error handling.
It measures the time taken for DNS resolution and returns diagnostic information.

## Parameters

### hostname

[`Hostname`](../type-aliases/Hostname.md)

A validated `Hostname` branded type

## Returns

`Effect`\<[`DiagnosticStep`](../interfaces/DiagnosticStep.md)\>

An Effect that resolves to a DiagnosticStep with the resolved IP or error

## Example

```typescript
import { Hostname } from '@univ-lehavre/atlas-net';

const step = await Effect.runPromise(dnsResolve(Hostname('example.com')));
if (step.status === 'ok') {
  console.log(`Resolved to ${step.message} in ${step.latencyMs}ms`);
}
```
