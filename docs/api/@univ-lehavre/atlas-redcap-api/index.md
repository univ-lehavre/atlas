# @univ-lehavre/atlas-redcap-api

TypeScript client for the REDCap API, built with [Effect](https://effect.website/).

## Installation

```bash
pnpm add @univ-lehavre/atlas-redcap-api
```

## Quick Start

```typescript
import { Effect } from 'effect';
import { createRedcapClient, RedcapUrl, RedcapToken } from '@univ-lehavre/atlas-redcap-api';

const client = createRedcapClient({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('YOUR_32_CHAR_HEXADECIMAL_TOKEN'),
});

// Export records
const records = await Effect.runPromise(
  client.exportRecords({
    fields: ['record_id', 'name', 'email'],
    forms: ['enrollment'],
  })
);
```

## Features

- **Type-safe**: Branded types for URLs, tokens, record IDs, instrument names, and more
- **Effect-based**: Full integration with the Effect ecosystem
- **Secure**: Built-in protection against filterLogic injection

## Branded Types

| Type             | Description                               |
| ---------------- | ----------------------------------------- |
| `RedcapUrl`      | Safe API URL (HTTP/HTTPS, no credentials) |
| `RedcapToken`    | 32-character uppercase hexadecimal token  |
| `RecordId`       | Alphanumeric ID (20+ characters)          |
| `InstrumentName` | Lowercase name with underscores           |
| `UserId`         | Alphanumeric user ID with underscores     |
| `Email`          | Valid email address                       |
| `PositiveInt`    | Integer >= 1                              |
| `NonEmptyString` | String with length > 0                    |
| `IsoTimestamp`   | ISO 8601 date/datetime                    |
| `BooleanFlag`    | 0 or 1                                    |

```typescript
import {
  RedcapUrl,
  RedcapToken,
  RecordId,
  InstrumentName,
  UserId,
  Email,
  PositiveInt,
  NonEmptyString,
  IsoTimestamp,
  BooleanFlag,
} from '@univ-lehavre/atlas-redcap-api';

// All branded types validate at runtime
const url = RedcapUrl('https://redcap.example.com/api/');
const token = RedcapToken('AABBCCDD11223344AABBCCDD11223344');
const recordId = RecordId('abc12345678901234567');
const instrument = InstrumentName('demographics');
const userId = UserId('john_doe');
const email = Email('user@example.com');
const projectId = PositiveInt(123);
const title = NonEmptyString('My Project');
const timestamp = IsoTimestamp('2024-01-15 10:30:00');
const flag = BooleanFlag(1);
```

## API

### Client Methods

| Method                | Description                              |
| --------------------- | ---------------------------------------- |
| `exportRecords`       | Export records with optional filtering   |
| `importRecords`       | Import records into REDCap               |
| `getSurveyLink`       | Get survey link for a record             |
| `downloadPdf`         | Download PDF for a record and instrument |
| `findUserIdByEmail`   | Find user ID by email address            |
| `getVersion`          | Get REDCap version                       |
| `getProjectInfo`      | Get project metadata                     |
| `getInstruments`      | Get list of instruments/forms            |
| `getFields`           | Get field metadata (data dictionary)     |
| `getExportFieldNames` | Get export field name mappings           |

### Error Types

| Error                | Description                   |
| -------------------- | ----------------------------- |
| `RedcapHttpError`    | HTTP error (non-2xx response) |
| `RedcapApiError`     | REDCap API error              |
| `RedcapNetworkError` | Network/connection error      |

## Documentation

See the [full documentation](https://univ-lehavre.github.io/atlas/api/redcap-api) for detailed usage examples.

## License

MIT

## Classes

| Class                                                 | Description                                          |
| ----------------------------------------------------- | ---------------------------------------------------- |
| [RedcapApiError](classes/RedcapApiError.md)           | Application-level error from REDCap API.             |
| [RedcapClientService](classes/RedcapClientService.md) | Effect Context Tag for the REDCap Client Service.    |
| [RedcapHttpError](classes/RedcapHttpError.md)         | HTTP-level error from REDCap API.                    |
| [RedcapNetworkError](classes/RedcapNetworkError.md)   | Network-level error during REDCap API communication. |

## Interfaces

| Interface                                                    | Description                                     |
| ------------------------------------------------------------ | ----------------------------------------------- |
| [ExportRecordsOptions](interfaces/ExportRecordsOptions.md)   | Options for exporting records from REDCap.      |
| [ImportRecordsOptions](interfaces/ImportRecordsOptions.md)   | Options for importing records into REDCap.      |
| [RedcapClient](interfaces/RedcapClient.md)                   | REDCap API client interface.                    |
| [RedcapConfig](interfaces/RedcapConfig.md)                   | Configuration for REDCap API client.            |
| [RedcapExportFieldName](interfaces/RedcapExportFieldName.md) | REDCap export field name mapping.               |
| [RedcapField](interfaces/RedcapField.md)                     | REDCap field metadata from the data dictionary. |
| [RedcapInstrument](interfaces/RedcapInstrument.md)           | REDCap instrument (form) metadata.              |
| [RedcapProjectInfo](interfaces/RedcapProjectInfo.md)         | REDCap project information returned by the API. |

## Type Aliases

| Type Alias                                       | Description                                             |
| ------------------------------------------------ | ------------------------------------------------------- |
| [BooleanFlag](type-aliases/BooleanFlag.md)       | Branded type for boolean flags (0 or 1).                |
| [Email](type-aliases/Email.md)                   | Branded type for email addresses.                       |
| [InstrumentName](type-aliases/InstrumentName.md) | Branded type for REDCap instrument names.               |
| [IsoTimestamp](type-aliases/IsoTimestamp.md)     | Branded type for ISO 8601 timestamps.                   |
| [NonEmptyString](type-aliases/NonEmptyString.md) | Branded type for non-empty strings.                     |
| [PositiveInt](type-aliases/PositiveInt.md)       | Branded type for positive integers.                     |
| [RecordId](type-aliases/RecordId.md)             | Branded type for REDCap record IDs.                     |
| [RedcapError](type-aliases/RedcapError.md)       | Union type representing all possible REDCap API errors. |
| [RedcapToken](type-aliases/RedcapToken.md)       | Branded type for REDCap API token.                      |
| [RedcapUrl](type-aliases/RedcapUrl.md)           | Branded type for REDCap API URL.                        |
| [UserId](type-aliases/UserId.md)                 | Branded type for REDCap user IDs.                       |

## Variables

| Variable                                      | Description                                           |
| --------------------------------------------- | ----------------------------------------------------- |
| [BooleanFlag](variables/BooleanFlag.md)       | -                                                     |
| [Email](variables/Email.md)                   | Constructor function for Email branded type.          |
| [InstrumentName](variables/InstrumentName.md) | Constructor function for InstrumentName branded type. |
| [IsoTimestamp](variables/IsoTimestamp.md)     | -                                                     |
| [NonEmptyString](variables/NonEmptyString.md) | Constructor function for NonEmptyString branded type. |
| [PositiveInt](variables/PositiveInt.md)       | Constructor function for PositiveInt branded type.    |
| [RecordId](variables/RecordId.md)             | Constructor function for RecordId branded type.       |
| [RedcapToken](variables/RedcapToken.md)       | Constructor function for RedcapToken branded type.    |
| [RedcapUrl](variables/RedcapUrl.md)           | Constructor function for RedcapUrl branded type.      |
| [UserId](variables/UserId.md)                 | Constructor function for UserId branded type.         |

## Functions

| Function                                                      | Description                                                             |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [createRedcapClient](functions/createRedcapClient.md)         | Creates a new REDCap API client instance.                               |
| [escapeFilterLogicValue](functions/escapeFilterLogicValue.md) | Escapes special characters in a value to be used in REDCap filterLogic. |
| [makeRedcapClientLayer](functions/makeRedcapClientLayer.md)   | Creates an Effect Layer providing the RedcapClientService.              |

## References

### BooleanFlagType

Renames and re-exports [BooleanFlag](variables/BooleanFlag.md)

---

### EmailType

Renames and re-exports [Email](variables/Email.md)

---

### InstrumentNameType

Renames and re-exports [InstrumentName](variables/InstrumentName.md)

---

### IsoTimestampType

Renames and re-exports [IsoTimestamp](variables/IsoTimestamp.md)

---

### NonEmptyStringType

Renames and re-exports [NonEmptyString](variables/NonEmptyString.md)

---

### PositiveIntType

Renames and re-exports [PositiveInt](variables/PositiveInt.md)

---

### RecordIdType

Renames and re-exports [RecordId](variables/RecordId.md)

---

### RedcapTokenType

Renames and re-exports [RedcapToken](variables/RedcapToken.md)

---

### RedcapUrlType

Renames and re-exports [RedcapUrl](variables/RedcapUrl.md)

---

### UserIdType

Renames and re-exports [UserId](variables/UserId.md)
