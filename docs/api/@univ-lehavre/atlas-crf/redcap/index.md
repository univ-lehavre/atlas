# redcap

## Description

REDCap API client for @univ-lehavre/crf.

## Example

```typescript
import { Effect } from 'effect';
import {
  createRedcapClient,
  RedcapUrl,
  RedcapToken
} from '@univ-lehavre/crf/redcap';

const client = createRedcapClient({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('AABBCCDD11223344AABBCCDD11223344'),
});

const version = await Effect.runPromise(client.getVersion());
```

## Classes

| Class | Description |
| ------ | ------ |
| [UnsupportedVersionError](classes/UnsupportedVersionError.md) | Error thrown when a version is not supported. |
| [VersionParseError](classes/VersionParseError.md) | Error thrown when a version string cannot be parsed. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [RedcapAdapter](interfaces/RedcapAdapter.md) | Interface for adapting REDCap API requests/responses based on server version. |
| [RedcapFeatures](interfaces/RedcapFeatures.md) | Feature flags indicating what's available in a REDCap version. |
| [Version](interfaces/Version.md) | Represents a semantic version with major, minor, and patch components. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [RedcapClientError](type-aliases/RedcapClientError.md) | All possible errors from the REDCap client. |
| [SupportedVersionString](type-aliases/SupportedVersionString.md) | - |
| [TransformedParams](type-aliases/TransformedParams.md) | Parameters for REDCap API requests after transformation. |

## Variables

| Variable | Description |
| ------ | ------ |
| [SUPPORTED\_VERSIONS](variables/SUPPORTED_VERSIONS.md) | Supported REDCap versions that have been tested with this client. |

## Functions

| Function | Description |
| ------ | ------ |
| [compareVersions](functions/compareVersions.md) | Compare two versions. |
| [formatVersion](functions/formatVersion.md) | Format a Version object as a string. |
| [getAdapter](functions/getAdapter.md) | Get the adapter for a specific REDCap version. Prefer using getAdapterEffect for better error handling. |
| [getAdapterEffect](functions/getAdapterEffect.md) | Get the adapter for a specific REDCap version as an Effect. |
| [getLatestAdapter](functions/getLatestAdapter.md) | Get the latest adapter (for the newest supported version). |
| [getMajorVersion](functions/getMajorVersion.md) | Get the major version number from a Version object. |
| [getMinSupportedVersion](functions/getMinSupportedVersion.md) | Get the minimum supported version. |
| [getSupportedVersionRanges](functions/getSupportedVersionRanges.md) | Get all supported version ranges. |
| [isVersionAtLeast](functions/isVersionAtLeast.md) | Check if a version is at least the specified minimum. |
| [isVersionInRange](functions/isVersionInRange.md) | Check if a version falls within a range [min, max). |
| [isVersionLessThan](functions/isVersionLessThan.md) | Check if a version is less than the specified maximum. |
| [isVersionSupported](functions/isVersionSupported.md) | Check if a version is supported. |
| [parseVersion](functions/parseVersion.md) | Parse a version string into a Version object. |

## References

### BooleanFlag

Re-exports [BooleanFlag](../crf/variables/BooleanFlag.md)

***

### BooleanFlagType

Renames and re-exports [BooleanFlag](../crf/variables/BooleanFlag.md)

***

### components

Re-exports [components](../crf/interfaces/components.md)

***

### createRedcapClient

Re-exports [createRedcapClient](../crf/functions/createRedcapClient.md)

***

### Email

Re-exports [Email](../crf/variables/Email.md)

***

### EmailType

Renames and re-exports [Email](../crf/variables/Email.md)

***

### ErrorResponse

Re-exports [ErrorResponse](../crf/type-aliases/ErrorResponse.md)

***

### escapeFilterLogicValue

Re-exports [escapeFilterLogicValue](../crf/functions/escapeFilterLogicValue.md)

***

### ExportFieldName

Re-exports [ExportFieldName](../crf/type-aliases/ExportFieldName.md)

***

### ExportRecordsOptions

Re-exports [ExportRecordsOptions](../crf/interfaces/ExportRecordsOptions.md)

***

### Field

Re-exports [Field](../crf/type-aliases/Field.md)

***

### ImportRecordsOptions

Re-exports [ImportRecordsOptions](../crf/interfaces/ImportRecordsOptions.md)

***

### ImportResult

Re-exports [ImportResult](../crf/type-aliases/ImportResult.md)

***

### Instrument

Re-exports [Instrument](../crf/type-aliases/Instrument.md)

***

### InstrumentName

Re-exports [InstrumentName](../crf/variables/InstrumentName.md)

***

### InstrumentNameType

Renames and re-exports [InstrumentName](../crf/variables/InstrumentName.md)

***

### IsoTimestamp

Re-exports [IsoTimestamp](../crf/variables/IsoTimestamp.md)

***

### IsoTimestampType

Renames and re-exports [IsoTimestamp](../crf/variables/IsoTimestamp.md)

***

### makeRedcapClientLayer

Re-exports [makeRedcapClientLayer](../crf/functions/makeRedcapClientLayer.md)

***

### NonEmptyString

Re-exports [NonEmptyString](../crf/variables/NonEmptyString.md)

***

### NonEmptyStringType

Renames and re-exports [NonEmptyString](../crf/variables/NonEmptyString.md)

***

### operations

Re-exports [operations](../crf/interfaces/operations.md)

***

### paths

Re-exports [paths](../crf/interfaces/paths.md)

***

### PositiveInt

Re-exports [PositiveInt](../crf/variables/PositiveInt.md)

***

### PositiveIntType

Renames and re-exports [PositiveInt](../crf/variables/PositiveInt.md)

***

### ProjectInfo

Re-exports [ProjectInfo](../crf/type-aliases/ProjectInfo.md)

***

### RecordId

Re-exports [RecordId](../crf/variables/RecordId.md)

***

### RecordIdType

Renames and re-exports [RecordId](../crf/variables/RecordId.md)

***

### RedcapApiError

Re-exports [RedcapApiError](../crf/classes/RedcapApiError.md)

***

### RedcapClient

Re-exports [RedcapClient](../crf/interfaces/RedcapClient.md)

***

### RedcapClientService

Re-exports [RedcapClientService](../crf/classes/RedcapClientService.md)

***

### RedcapConfig

Re-exports [RedcapConfig](../crf/interfaces/RedcapConfig.md)

***

### RedcapError

Re-exports [RedcapError](../crf/type-aliases/RedcapError.md)

***

### RedcapHttpError

Re-exports [RedcapHttpError](../crf/classes/RedcapHttpError.md)

***

### RedcapNetworkError

Re-exports [RedcapNetworkError](../crf/classes/RedcapNetworkError.md)

***

### RedcapToken

Re-exports [RedcapToken](../crf/variables/RedcapToken.md)

***

### RedcapTokenType

Renames and re-exports [RedcapToken](../crf/variables/RedcapToken.md)

***

### RedcapUrl

Re-exports [RedcapUrl](../crf/variables/RedcapUrl.md)

***

### RedcapUrlType

Renames and re-exports [RedcapUrl](../crf/variables/RedcapUrl.md)

***

### UserId

Re-exports [UserId](../crf/variables/UserId.md)

***

### UserIdType

Renames and re-exports [UserId](../crf/variables/UserId.md)
