# Interface: RedcapClient

Defined in: [packages/redcap-api/src/types.ts:296](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/redcap-api/src/types.ts#L296)

REDCap API client interface.

Provides methods for interacting with a REDCap project through its API.
All methods return Effect types for functional error handling and composition.

## Example

```typescript
import { Effect, pipe } from 'effect';
import { createRedcapClient, RedcapUrl, RedcapToken } from '@univ-lehavre/atlas-redcap-api';

const client = createRedcapClient({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('AABBCCDD11223344AABBCCDD11223344'),
});

// Fetch project info and records in parallel
const program = Effect.all({
  info: client.getProjectInfo(),
  records: client.exportRecords<{ record_id: string }>(),
});

const { info, records } = await Effect.runPromise(program);
```

## See

- [createRedcapClient](../functions/createRedcapClient.md) - Factory function to create a client
- [makeRedcapClientLayer](../functions/makeRedcapClientLayer.md) - Create an Effect Layer for dependency injection

## Properties

### downloadPdf()

> `readonly` **downloadPdf**: (`recordId`, `instrument`) => `Effect`\<`ArrayBuffer`, [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Defined in: [packages/redcap-api/src/types.ts:477](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/redcap-api/src/types.ts#L477)

Downloads a PDF of a completed instrument for a record.

#### Parameters

##### recordId

[`RecordId`](../type-aliases/RecordId.md)

The record ID (branded RecordId)

##### instrument

[`InstrumentName`](../type-aliases/InstrumentName.md)

The instrument name (branded InstrumentName)

#### Returns

`Effect`\<`ArrayBuffer`, [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Effect resolving to PDF binary data as ArrayBuffer

#### Example

```typescript
const pdfBuffer = await Effect.runPromise(
  client.downloadPdf(RecordId('abc12345678901234567'), InstrumentName('consent_form'))
);
// Save or send the PDF
fs.writeFileSync('consent.pdf', Buffer.from(pdfBuffer));
```

---

### exportRecords()

> `readonly` **exportRecords**: \<`T`\>(`options?`) => `Effect`\<readonly `T`[], [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Defined in: [packages/redcap-api/src/types.ts:403](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/redcap-api/src/types.ts#L403)

Exports records from the project.

#### Type Parameters

##### T

`T`

The expected shape of each record

#### Parameters

##### options?

[`ExportRecordsOptions`](ExportRecordsOptions.md)

Optional filtering and export options

#### Returns

`Effect`\<readonly `T`[], [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Effect resolving to array of records

#### Example

```typescript
interface Patient {
  record_id: string;
  first_name: string;
  last_name: string;
  age: number;
}

const patients = await Effect.runPromise(
  client.exportRecords<Patient>({
    fields: ['record_id', 'first_name', 'last_name', 'age'],
    filterLogic: '[age] >= 18',
  })
);
```

---

### findUserIdByEmail()

> `readonly` **findUserIdByEmail**: (`email`) => `Effect`\<`string` \| `null`, [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Defined in: [packages/redcap-api/src/types.ts:503](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/redcap-api/src/types.ts#L503)

Finds a user's record ID by their email address.

Searches for a record where the 'email' field matches the provided address.
Email values are automatically escaped to prevent filter logic injection.

#### Parameters

##### email

`string`

The email address to search for

#### Returns

`Effect`\<`string` \| `null`, [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Effect resolving to the userid if found, or null if not found

#### Example

```typescript
const userId = await Effect.runPromise(client.findUserIdByEmail('john.doe@example.com'));
if (userId) {
  console.log(`Found user: ${userId}`);
} else {
  console.log('User not found');
}
```

---

### getExportFieldNames()

> `readonly` **getExportFieldNames**: () => `Effect`\<readonly [`RedcapExportFieldName`](RedcapExportFieldName.md)[], [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Defined in: [packages/redcap-api/src/types.ts:374](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/redcap-api/src/types.ts#L374)

Gets export field name mappings.

Useful for understanding how checkbox fields expand to multiple columns.

#### Returns

`Effect`\<readonly [`RedcapExportFieldName`](RedcapExportFieldName.md)[], [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Effect resolving to array of field name mappings

#### Example

```typescript
const mappings = await Effect.runPromise(client.getExportFieldNames());
// Find all export columns for a checkbox field
const checkboxCols = mappings.filter((m) => m.original_field_name === 'symptoms');
```

---

### getFields()

> `readonly` **getFields**: () => `Effect`\<readonly [`RedcapField`](RedcapField.md)[], [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Defined in: [packages/redcap-api/src/types.ts:355](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/redcap-api/src/types.ts#L355)

Gets all fields (data dictionary) from the project.

#### Returns

`Effect`\<readonly [`RedcapField`](RedcapField.md)[], [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Effect resolving to array of field metadata

#### Example

```typescript
const fields = await Effect.runPromise(client.getFields());
const textFields = fields.filter((f) => f.field_type === 'text');
```

---

### getInstruments()

> `readonly` **getInstruments**: () => `Effect`\<readonly [`RedcapInstrument`](RedcapInstrument.md)[], [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Defined in: [packages/redcap-api/src/types.ts:339](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/redcap-api/src/types.ts#L339)

Gets all instruments (forms) in the project.

#### Returns

`Effect`\<readonly [`RedcapInstrument`](RedcapInstrument.md)[], [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Effect resolving to array of instrument metadata

#### Example

```typescript
const instruments = await Effect.runPromise(client.getInstruments());
const formNames = instruments.map((i) => i.instrument_name);
```

---

### getProjectInfo()

> `readonly` **getProjectInfo**: () => `Effect`\<[`RedcapProjectInfo`](RedcapProjectInfo.md), [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Defined in: [packages/redcap-api/src/types.ts:323](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/redcap-api/src/types.ts#L323)

Gets project information and settings.

#### Returns

`Effect`\<[`RedcapProjectInfo`](RedcapProjectInfo.md), [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Effect resolving to project metadata

#### Example

```typescript
const info = await Effect.runPromise(client.getProjectInfo());
if (info.in_production === 1) {
  console.log('Project is in production mode');
}
```

---

### getSurveyLink()

> `readonly` **getSurveyLink**: (`record`, `instrument`) => `Effect`\<`string`, [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Defined in: [packages/redcap-api/src/types.ts:453](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/redcap-api/src/types.ts#L453)

Gets a survey link for a specific record and instrument.

#### Parameters

##### record

[`RecordId`](../type-aliases/RecordId.md)

The record ID (branded RecordId)

##### instrument

[`InstrumentName`](../type-aliases/InstrumentName.md)

The instrument name (branded InstrumentName)

#### Returns

`Effect`\<`string`, [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Effect resolving to the survey URL

#### Example

```typescript
const surveyUrl = await Effect.runPromise(
  client.getSurveyLink(RecordId('abc12345678901234567'), InstrumentName('satisfaction_survey'))
);
// Send surveyUrl to participant
```

---

### getVersion()

> `readonly` **getVersion**: () => `Effect`\<`string`, [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Defined in: [packages/redcap-api/src/types.ts:308](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/redcap-api/src/types.ts#L308)

Gets the REDCap version number.

#### Returns

`Effect`\<`string`, [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Effect resolving to the version string (e.g., '13.7.0')

#### Example

```typescript
const version = await Effect.runPromise(client.getVersion());
console.log(`REDCap version: ${version}`);
```

---

### importRecords()

> `readonly` **importRecords**: (`records`, `options?`) => `Effect`\<\{ `count`: `number`; \}, [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Defined in: [packages/redcap-api/src/types.ts:427](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/redcap-api/src/types.ts#L427)

Imports records into the project.

#### Parameters

##### records

readonly `Record`\<`string`, `unknown`\>[]

Array of record objects to import

##### options?

[`ImportRecordsOptions`](ImportRecordsOptions.md)

Optional import behavior settings

#### Returns

`Effect`\<\{ `count`: `number`; \}, [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Effect resolving to import result with count

#### Example

```typescript
const newRecords = [
  { record_id: '1', first_name: 'John', last_name: 'Doe' },
  { record_id: '2', first_name: 'Jane', last_name: 'Smith' },
];

const result = await Effect.runPromise(
  client.importRecords(newRecords, { overwriteBehavior: 'normal' })
);
console.log(`Imported ${result.count} records`);
```
