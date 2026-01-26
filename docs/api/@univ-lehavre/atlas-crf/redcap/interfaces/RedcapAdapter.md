# Interface: RedcapAdapter

Defined in: [packages/crf/src/redcap/adapters/types.ts:22](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/crf/src/redcap/adapters/types.ts#L22)

Interface for adapting REDCap API requests/responses based on server version.

Each adapter handles the differences between REDCap versions, including:
- Parameter name/format changes
- Endpoint availability
- Response schema differences

## Properties

### getDefaultParams()

> `readonly` **getDefaultParams**: () => [`TransformedParams`](../type-aliases/TransformedParams.md)

Defined in: [packages/crf/src/redcap/adapters/types.ts:70](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/crf/src/redcap/adapters/types.ts#L70)

Get any version-specific default parameters.

#### Returns

[`TransformedParams`](../type-aliases/TransformedParams.md)

Default parameters to include in all requests

***

### getFeatures()

> `readonly` **getFeatures**: () => [`RedcapFeatures`](RedcapFeatures.md)

Defined in: [packages/crf/src/redcap/adapters/types.ts:77](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/crf/src/redcap/adapters/types.ts#L77)

Get supported features for this version.

#### Returns

[`RedcapFeatures`](RedcapFeatures.md)

Object describing feature availability

***

### isEndpointAvailable()

> `readonly` **isEndpointAvailable**: (`content`, `action?`) => `boolean`

Defined in: [packages/crf/src/redcap/adapters/types.ts:63](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/crf/src/redcap/adapters/types.ts#L63)

Check if a specific endpoint/content type is available in this version.

#### Parameters

##### content

`string`

The REDCap content type (e.g., 'record', 'metadata')

##### action?

`string`

Optional action (e.g., 'export', 'import')

#### Returns

`boolean`

true if the endpoint is available

***

### maxVersion

> `readonly` **maxVersion**: [`Version`](Version.md) \| `undefined`

Defined in: [packages/crf/src/redcap/adapters/types.ts:30](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/crf/src/redcap/adapters/types.ts#L30)

Maximum REDCap version supported by this adapter (exclusive)

***

### minVersion

> `readonly` **minVersion**: [`Version`](Version.md)

Defined in: [packages/crf/src/redcap/adapters/types.ts:27](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/crf/src/redcap/adapters/types.ts#L27)

Minimum REDCap version supported by this adapter (inclusive)

***

### name

> `readonly` **name**: `string`

Defined in: [packages/crf/src/redcap/adapters/types.ts:24](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/crf/src/redcap/adapters/types.ts#L24)

Human-readable name for this adapter

***

### parseProjectInfo()

> `readonly` **parseProjectInfo**: (`response`) => `object`

Defined in: [packages/crf/src/redcap/adapters/types.ts:54](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/crf/src/redcap/adapters/types.ts#L54)

Parse and normalize the project info response.

#### Parameters

##### response

`unknown`

Raw response from REDCap

#### Returns

Normalized ProjectInfo object

##### creation\_time

> **creation\_time**: `string`

###### Description

ISO 8601 timestamp of project creation

###### Example

```ts
2024-01-15 10:30:00
```

##### in\_production

> **in\_production**: `0` \| `1`

##### project\_id

> **project\_id**: `number`

###### Description

Unique project identifier

##### project\_title

> **project\_title**: `string`

###### Description

Human-readable project title

##### record\_autonumbering\_enabled

> **record\_autonumbering\_enabled**: `0` \| `1`

***

### transformExportParams()

> `readonly` **transformExportParams**: (`params`) => [`TransformedParams`](../type-aliases/TransformedParams.md)

Defined in: [packages/crf/src/redcap/adapters/types.ts:38](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/crf/src/redcap/adapters/types.ts#L38)

Transform export records parameters for this version.

#### Parameters

##### params

[`TransformedParams`](../type-aliases/TransformedParams.md)

The base parameters

#### Returns

[`TransformedParams`](../type-aliases/TransformedParams.md)

Transformed parameters suitable for this REDCap version

***

### transformImportParams()

> `readonly` **transformImportParams**: (`params`) => [`TransformedParams`](../type-aliases/TransformedParams.md)

Defined in: [packages/crf/src/redcap/adapters/types.ts:46](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/crf/src/redcap/adapters/types.ts#L46)

Transform import records parameters for this version.

#### Parameters

##### params

[`TransformedParams`](../type-aliases/TransformedParams.md)

The base parameters

#### Returns

[`TransformedParams`](../type-aliases/TransformedParams.md)

Transformed parameters suitable for this REDCap version
