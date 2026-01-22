# Function: dnsResolve()

> **dnsResolve**(`hostname`): `Effect`\<[`DiagnosticStep`](../interfaces/DiagnosticStep.md)\>

Defined in: [diagnostics.ts:66](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/net/src/diagnostics.ts#L66)

Resolves a hostname to an IP address using DNS lookup.

This function wraps Node's `dns.lookup` in an Effect for functional error handling.
It measures the time taken for DNS resolution and returns diagnostic information.

## Parameters

### hostname

`string`

The hostname to resolve (e.g., 'example.com')

## Returns

`Effect`\<[`DiagnosticStep`](../interfaces/DiagnosticStep.md)\>

An Effect that resolves to a DiagnosticStep with the resolved IP or error

## Example

```typescript
const step = await Effect.runPromise(dnsResolve('example.com'));
if (step.status === 'ok') {
  console.log(`Resolved to ${step.message} in ${step.latencyMs}ms`);
}
```
