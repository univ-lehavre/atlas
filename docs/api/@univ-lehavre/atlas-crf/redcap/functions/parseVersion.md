# Function: parseVersion()

> **parseVersion**(`versionString`): `Effect`\<[`Version`](../interfaces/Version.md), [`VersionParseError`](../classes/VersionParseError.md)\>

Defined in: [packages/crf/src/redcap/version.ts:69](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/version.ts#L69)

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
