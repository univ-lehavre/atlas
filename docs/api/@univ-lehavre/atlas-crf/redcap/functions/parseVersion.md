# Function: parseVersion()

> **parseVersion**(`versionString`): `Effect`\<[`Version`](../interfaces/Version.md), [`VersionParseError`](../classes/VersionParseError.md)\>

Defined in: [packages/crf/src/redcap/version.ts:69](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/crf/src/redcap/version.ts#L69)

Parse a version string into a Version object.

## Parameters

### versionString

`string`

Version string in format "X.Y.Z" (e.g., "14.5.10")

## Returns

`Effect`\<[`Version`](../interfaces/Version.md), [`VersionParseError`](../classes/VersionParseError.md)\>

Effect containing the parsed Version or a VersionParseError

## Example

```typescript
const version = yield* parseVersion("14.5.10");
// { major: 14, minor: 5, patch: 10 }
```
