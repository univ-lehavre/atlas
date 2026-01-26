# Interface: components

Defined in: [packages/crf/src/redcap/generated/types.ts:30](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/generated/types.ts#L30)

## Properties

### headers

> **headers**: `never`

Defined in: [packages/crf/src/redcap/generated/types.ts:282](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/generated/types.ts#L282)

***

### parameters

> **parameters**: `never`

Defined in: [packages/crf/src/redcap/generated/types.ts:280](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/generated/types.ts#L280)

***

### pathItems

> **pathItems**: `never`

Defined in: [packages/crf/src/redcap/generated/types.ts:283](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/generated/types.ts#L283)

***

### requestBodies

> **requestBodies**: `never`

Defined in: [packages/crf/src/redcap/generated/types.ts:281](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/generated/types.ts#L281)

***

### responses

> **responses**: `never`

Defined in: [packages/crf/src/redcap/generated/types.ts:279](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/generated/types.ts#L279)

***

### schemas

> **schemas**: `object`

Defined in: [packages/crf/src/redcap/generated/types.ts:31](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/generated/types.ts#L31)

#### BooleanFlag

> **BooleanFlag**: `0` \| `1`

##### Description

Boolean represented as 0 or 1

#### Email

> **Email**: `string`

Format: email

##### Description

Valid email address

##### Example

```ts
user@example.com
```

#### ErrorResponse

> **ErrorResponse**: `object`

##### ErrorResponse.error

> **error**: `string`

###### Description

Error message from REDCap

#### ExportFieldName

> **ExportFieldName**: `object`

##### ExportFieldName.choice\_value

> **choice\_value**: `string`

###### Description

For checkbox fields - the choice value; empty for others

##### ExportFieldName.export\_field\_name

> **export\_field\_name**: `string`

###### Description

Actual column name in exports (e.g., symptoms___1)

##### ExportFieldName.original\_field\_name

> **original\_field\_name**: `string`

###### Description

Original field name from data dictionary

#### ExportFieldNamesRequest

> **ExportFieldNamesRequest**: `object`

##### ExportFieldNamesRequest.content

> **content**: `"exportFieldNames"`

###### Description

discriminator enum property added by openapi-typescript

##### ExportFieldNamesRequest.token

> **token**: `string`

#### Field

> **Field**: `object`

##### Field.branching\_logic?

> `optional` **branching\_logic**: `string`

###### Description

Branching logic expression

##### Field.custom\_alignment?

> `optional` **custom\_alignment**: `""` \| `"LH"` \| `"LV"` \| `"RH"` \| `"RV"`

###### Description

Custom field alignment

##### Field.field\_annotation?

> `optional` **field\_annotation**: `string`

###### Description

Action tags and annotations (e.g., @HIDDEN, @DEFAULT)

##### Field.field\_label

> **field\_label**: `string`

###### Description

Display label shown to users

##### Field.field\_name

> **field\_name**: `string`

###### Description

Variable name for the field

##### Field.field\_note?

> `optional` **field\_note**: `string`

###### Description

Additional instructions displayed below the field

##### Field.field\_type

> **field\_type**: `"text"` \| `"textarea"` \| `"calc"` \| `"dropdown"` \| `"radio"` \| `"checkbox"` \| `"yesno"` \| `"truefalse"` \| `"file"` \| `"slider"` \| `"descriptive"` \| `"sql"`

###### Description

Field input type

##### Field.form\_name

> **form\_name**: `string`

##### Field.identifier?

> `optional` **identifier**: `""` \| `"y"`

###### Description

Whether field contains identifying information

##### Field.matrix\_group\_name?

> `optional` **matrix\_group\_name**: `string`

###### Description

Matrix group name if part of a matrix

##### Field.matrix\_ranking?

> `optional` **matrix\_ranking**: `string`

##### Field.question\_number?

> `optional` **question\_number**: `string`

###### Description

Question number for display

##### Field.required\_field?

> `optional` **required\_field**: `""` \| `"y"`

###### Description

Whether field is required

##### Field.select\_choices\_or\_calculations?

> `optional` **select\_choices\_or\_calculations**: `string`

###### Description

For choice fields - pipe-separated values; for calc fields - formula

##### Field.text\_validation\_max?

> `optional` **text\_validation\_max**: `string`

###### Description

Maximum allowed value

##### Field.text\_validation\_min?

> `optional` **text\_validation\_min**: `string`

###### Description

Minimum allowed value

##### Field.text\_validation\_type\_or\_show\_slider\_number?

> `optional` **text\_validation\_type\_or\_show\_slider\_number**: `string`

###### Description

Validation type (email, integer, date_ymd, etc.)

#### ImportResult

> **ImportResult**: `object`

##### ImportResult.count

> **count**: `number`

###### Description

Number of records imported

#### Instrument

> **Instrument**: `object`

##### Instrument.instrument\_label

> **instrument\_label**: `string`

###### Description

Human-readable instrument label

###### Example

```ts
Demographics Form
```

##### Instrument.instrument\_name

> **instrument\_name**: `string`

#### InstrumentName

> **InstrumentName**: `string`

##### Description

REDCap instrument (form) name.
    Must start with lowercase letter, can contain lowercase letters, digits, and underscores.

##### Example

```ts
demographics
```

#### InstrumentRequest

> **InstrumentRequest**: `object`

##### InstrumentRequest.content

> **content**: `"instrument"`

###### Description

discriminator enum property added by openapi-typescript

##### InstrumentRequest.token

> **token**: `string`

#### MetadataRequest

> **MetadataRequest**: `object`

##### MetadataRequest.content

> **content**: `"metadata"`

###### Description

discriminator enum property added by openapi-typescript

##### MetadataRequest.token

> **token**: `string`

#### PdfRequest

> **PdfRequest**: `object`

##### PdfRequest.content

> **content**: `"pdf"`

###### Description

discriminator enum property added by openapi-typescript

##### PdfRequest.instrument?

> `optional` **instrument**: `string`

##### PdfRequest.record

> **record**: `string`

##### PdfRequest.token

> **token**: `string`

#### ProjectInfo

> **ProjectInfo**: `object`

##### ProjectInfo.creation\_time

> **creation\_time**: `string`

###### Description

ISO 8601 timestamp of project creation

###### Example

```ts
2024-01-15 10:30:00
```

##### ProjectInfo.in\_production

> **in\_production**: `0` \| `1`

##### ProjectInfo.project\_id

> **project\_id**: `number`

###### Description

Unique project identifier

##### ProjectInfo.project\_title

> **project\_title**: `string`

###### Description

Human-readable project title

##### ProjectInfo.record\_autonumbering\_enabled

> **record\_autonumbering\_enabled**: `0` \| `1`

#### ProjectRequest

> **ProjectRequest**: `object`

##### ProjectRequest.content

> **content**: `"project"`

###### Description

discriminator enum property added by openapi-typescript

##### ProjectRequest.token

> **token**: `string`

#### RecordExportRequest

> **RecordExportRequest**: `object`

##### RecordExportRequest.action

> **action**: `"export"`

###### Constant

##### RecordExportRequest.content

> **content**: `"record"`

###### Description

discriminator enum property added by openapi-typescript

##### RecordExportRequest.fields?

> `optional` **fields**: `string`

###### Description

Comma-separated list of field names to export

##### RecordExportRequest.filterLogic?

> `optional` **filterLogic**: `string`

###### Description

REDCap filter logic expression (e.g., "[age] >= 18")

##### RecordExportRequest.format

> **format**: `"json"` \| `"csv"` \| `"xml"`

###### Default

```ts
json
@enum {string}
```

##### RecordExportRequest.forms?

> `optional` **forms**: `string`

###### Description

Comma-separated list of form names to export

##### RecordExportRequest.rawOrLabel

> **rawOrLabel**: `"raw"` \| `"label"`

###### Description

Return raw coded values or display labels

###### Default

```ts
raw
@enum {string}
```

##### RecordExportRequest.token

> **token**: `string`

##### RecordExportRequest.type

> **type**: `"flat"` \| `"eav"`

###### Description

Export format - flat (one row per record) or EAV

###### Default

```ts
flat
@enum {string}
```

#### RecordId

> **RecordId**: `string`

##### Description

Alphanumeric record identifier (at least 20 characters).
    Compatible with Appwrite-style IDs.

##### Example

```ts
abc12345678901234567
```

#### RecordImportRequest

> **RecordImportRequest**: `object`

##### RecordImportRequest.action

> **action**: `"import"`

###### Constant

##### RecordImportRequest.content

> **content**: `"RecordImportRequest"`

###### Description

discriminator enum property added by openapi-typescript

##### RecordImportRequest.data

> **data**: `string`

###### Description

JSON string of records to import

##### RecordImportRequest.format

> **format**: `"json"` \| `"csv"` \| `"xml"`

###### Default

```ts
json
@enum {string}
```

##### RecordImportRequest.overwriteBehavior

> **overwriteBehavior**: `"normal"` \| `"overwrite"`

###### Description

normal: only overwrite fields with new values
    overwrite: overwrite all fields, blanking empty ones

###### Default

```ts
normal
@enum {string}
```

##### RecordImportRequest.returnContent

> **returnContent**: `"count"` \| `"ids"` \| `"auto_ids"`

###### Default

```ts
count
@enum {string}
```

##### RecordImportRequest.token

> **token**: `string`

#### RedcapToken

> **RedcapToken**: `string`

##### Description

32-character uppercase hexadecimal API token.
    Used to authenticate all API requests.

##### Example

```ts
AABBCCDD11223344AABBCCDD11223344
```

#### SurveyLinkRequest

> **SurveyLinkRequest**: `object`

##### SurveyLinkRequest.content

> **content**: `"surveyLink"`

###### Description

discriminator enum property added by openapi-typescript

##### SurveyLinkRequest.instrument

> **instrument**: `string`

##### SurveyLinkRequest.record

> **record**: `string`

##### SurveyLinkRequest.token

> **token**: `string`

#### VersionRequest

> **VersionRequest**: `object`

##### VersionRequest.content

> **content**: `"version"`

###### Description

discriminator enum property added by openapi-typescript

##### VersionRequest.token

> **token**: `string`
