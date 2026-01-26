# Interface: operations

Defined in: [packages/crf/src/redcap/generated/types.ts:286](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/crf/src/redcap/generated/types.ts#L286)

## Properties

### request

> **request**: `object`

Defined in: [packages/crf/src/redcap/generated/types.ts:287](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/crf/src/redcap/generated/types.ts#L287)

#### parameters

> **parameters**: `object`

##### parameters.cookie?

> `optional` **cookie**: `undefined`

##### parameters.header?

> `optional` **header**: `undefined`

##### parameters.path?

> `optional` **path**: `undefined`

##### parameters.query?

> `optional` **query**: `undefined`

#### requestBody

> **requestBody**: `object`

##### requestBody.content

> **content**: `object`

##### requestBody.content.application/x-www-form-urlencoded

> **application/x-www-form-urlencoded**: \{ `content`: `"version"`; `token`: `string`; \} \| \{ `content`: `"project"`; `token`: `string`; \} \| \{ `content`: `"instrument"`; `token`: `string`; \} \| \{ `content`: `"metadata"`; `token`: `string`; \} \| \{ `content`: `"exportFieldNames"`; `token`: `string`; \} \| \{ `action`: `"export"`; `content`: `"record"`; `fields?`: `string`; `filterLogic?`: `string`; `format`: `"json"` \| `"csv"` \| `"xml"`; `forms?`: `string`; `rawOrLabel`: `"raw"` \| `"label"`; `token`: `string`; `type`: `"flat"` \| `"eav"`; \} \| \{ `action`: `"import"`; `content`: `"RecordImportRequest"`; `data`: `string`; `format`: `"json"` \| `"csv"` \| `"xml"`; `overwriteBehavior`: `"normal"` \| `"overwrite"`; `returnContent`: `"count"` \| `"ids"` \| `"auto_ids"`; `token`: `string`; \} \| \{ `content`: `"surveyLink"`; `instrument`: `string`; `record`: `string`; `token`: `string`; \} \| \{ `content`: `"pdf"`; `instrument?`: `string`; `record`: `string`; `token`: `string`; \}

###### Type Declaration

\{ `content`: `"version"`; `token`: `string`; \}

\{ `content`: `"project"`; `token`: `string`; \}

\{ `content`: `"instrument"`; `token`: `string`; \}

\{ `content`: `"metadata"`; `token`: `string`; \}

\{ `content`: `"exportFieldNames"`; `token`: `string`; \}

\{ `action`: `"export"`; `content`: `"record"`; `fields?`: `string`; `filterLogic?`: `string`; `format`: `"json"` \| `"csv"` \| `"xml"`; `forms?`: `string`; `rawOrLabel`: `"raw"` \| `"label"`; `token`: `string`; `type`: `"flat"` \| `"eav"`; \}

\{ `action`: `"import"`; `content`: `"RecordImportRequest"`; `data`: `string`; `format`: `"json"` \| `"csv"` \| `"xml"`; `overwriteBehavior`: `"normal"` \| `"overwrite"`; `returnContent`: `"count"` \| `"ids"` \| `"auto_ids"`; `token`: `string`; \}

\{ `content`: `"surveyLink"`; `instrument`: `string`; `record`: `string`; `token`: `string`; \}

\{ `content`: `"pdf"`; `instrument?`: `string`; `record`: `string`; `token`: `string`; \}

#### responses

> **responses**: `object`

##### responses.200

> **200**: `object`

###### Description

Success - response format varies by content type

##### responses.200.content

> **content**: `object`

##### responses.200.content.application/json

> **application/json**: `string` \| \{ `creation_time`: `string`; `in_production`: `0` \| `1`; `project_id`: `number`; `project_title`: `string`; `record_autonumbering_enabled`: `0` \| `1`; \} \| \{ `count`: `number`; \} \| `object`[] \| `object`[] \| `object`[] \| `object`[]

###### Type Declaration

`string`

\{ `creation_time`: `string`; `in_production`: `0` \| `1`; `project_id`: `number`; `project_title`: `string`; `record_autonumbering_enabled`: `0` \| `1`; \}

\{ `count`: `number`; \}

`object`[]

`object`[]

`object`[]

`object`[]

##### responses.200.content.application/pdf

> **application/pdf**: `string`

##### responses.200.content.text/plain

> **text/plain**: `string`

##### responses.200.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.400

> **400**: `object`

###### Description

Invalid request parameters

##### responses.400.content

> **content**: `object`

##### responses.400.content.application/json

> **application/json**: `object`

##### responses.400.content.application/json.error

> **error**: `string`

###### Description

Error message from REDCap

##### responses.400.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.403

> **403**: `object`

###### Description

Invalid or missing token

##### responses.403.content

> **content**: `object`

##### responses.403.content.application/json

> **application/json**: `object`

##### responses.403.content.application/json.error

> **error**: `string`

###### Description

Error message from REDCap

##### responses.403.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`
