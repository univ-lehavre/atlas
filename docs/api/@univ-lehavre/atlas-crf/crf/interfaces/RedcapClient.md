# Interface: RedcapClient

Defined in: [packages/crf/src/redcap/types.ts:85](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/types.ts#L85)

REDCap API client interface.

The client automatically detects the REDCap server version and adapts
its requests accordingly. Methods that require version-specific behavior
may fail with VersionParseError or UnsupportedVersionError.

## Properties

### downloadPdf()

> `readonly` **downloadPdf**: (`recordId`, `instrument`) => `Effect`\<`ArrayBuffer`, [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Defined in: [packages/crf/src/redcap/types.ts:119](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/types.ts#L119)

#### Parameters

##### recordId

[`RecordId`](../type-aliases/RecordId.md)

##### instrument

[`InstrumentName`](../type-aliases/InstrumentName.md)

#### Returns

`Effect`\<`ArrayBuffer`, [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

***

### exportRecords()

> `readonly` **exportRecords**: \<`T`\>(`options?`) => `Effect`\<readonly `T`[], [`RedcapClientError`](../../redcap/type-aliases/RedcapClientError.md)\>

Defined in: [packages/crf/src/redcap/types.ts:105](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/types.ts#L105)

#### Type Parameters

##### T

`T`

#### Parameters

##### options?

[`ExportRecordsOptions`](ExportRecordsOptions.md)

#### Returns

`Effect`\<readonly `T`[], [`RedcapClientError`](../../redcap/type-aliases/RedcapClientError.md)\>

***

### findUserIdByEmail()

> `readonly` **findUserIdByEmail**: (`email`) => `Effect`\<`string` \| `null`, [`RedcapClientError`](../../redcap/type-aliases/RedcapClientError.md)\>

Defined in: [packages/crf/src/redcap/types.ts:124](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/types.ts#L124)

#### Parameters

##### email

`string`

#### Returns

`Effect`\<`string` \| `null`, [`RedcapClientError`](../../redcap/type-aliases/RedcapClientError.md)\>

***

### getExportFieldNames()

> `readonly` **getExportFieldNames**: () => `Effect`\<readonly `object`[], [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Defined in: [packages/crf/src/redcap/types.ts:100](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/types.ts#L100)

#### Returns

`Effect`\<readonly `object`[], [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

***

### getFields()

> `readonly` **getFields**: () => `Effect`\<readonly `object`[], [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Defined in: [packages/crf/src/redcap/types.ts:95](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/types.ts#L95)

#### Returns

`Effect`\<readonly `object`[], [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

***

### getInstruments()

> `readonly` **getInstruments**: () => `Effect`\<readonly `object`[], [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Defined in: [packages/crf/src/redcap/types.ts:90](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/types.ts#L90)

#### Returns

`Effect`\<readonly `object`[], [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapApiError`](../classes/RedcapApiError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

***

### getProjectInfo()

> `readonly` **getProjectInfo**: () => `Effect`\<\{ `creation_time`: `string`; `in_production`: `0` \| `1`; `project_id`: `number`; `project_title`: `string`; `record_autonumbering_enabled`: `0` \| `1`; \}, [`RedcapClientError`](../../redcap/type-aliases/RedcapClientError.md)\>

Defined in: [packages/crf/src/redcap/types.ts:88](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/types.ts#L88)

#### Returns

`Effect`\<\{ `creation_time`: `string`; `in_production`: `0` \| `1`; `project_id`: `number`; `project_title`: `string`; `record_autonumbering_enabled`: `0` \| `1`; \}, [`RedcapClientError`](../../redcap/type-aliases/RedcapClientError.md)\>

***

### getSurveyLink()

> `readonly` **getSurveyLink**: (`record`, `instrument`) => `Effect`\<`string`, [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Defined in: [packages/crf/src/redcap/types.ts:114](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/types.ts#L114)

#### Parameters

##### record

[`RecordId`](../type-aliases/RecordId.md)

##### instrument

[`InstrumentName`](../type-aliases/InstrumentName.md)

#### Returns

`Effect`\<`string`, [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

***

### getVersion()

> `readonly` **getVersion**: () => `Effect`\<`string`, [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

Defined in: [packages/crf/src/redcap/types.ts:86](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/types.ts#L86)

#### Returns

`Effect`\<`string`, [`RedcapHttpError`](../classes/RedcapHttpError.md) \| [`RedcapNetworkError`](../classes/RedcapNetworkError.md)\>

***

### importRecords()

> `readonly` **importRecords**: (`records`, `options?`) => `Effect`\<\{ `count`: `number`; \}, [`RedcapClientError`](../../redcap/type-aliases/RedcapClientError.md)\>

Defined in: [packages/crf/src/redcap/types.ts:109](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/types.ts#L109)

#### Parameters

##### records

readonly `Record`\<`string`, `unknown`\>[]

##### options?

[`ImportRecordsOptions`](ImportRecordsOptions.md)

#### Returns

`Effect`\<\{ `count`: `number`; \}, [`RedcapClientError`](../../redcap/type-aliases/RedcapClientError.md)\>
