[**@univ-lehavre/atlas-redcap-api**](../README.md)

---

[@univ-lehavre/atlas-redcap-api](../README.md) / ExportRecordsOptions

# Interface: ExportRecordsOptions

Defined in: [packages/redcap-api/src/types.ts:206](https://github.com/univ-lehavre/atlas/blob/efca797d113c12556abf22a7fdb97dae8aa62ade/packages/redcap-api/src/types.ts#L206)

Options for exporting records from REDCap.

Allows filtering and customizing the export of record data.
All options are optional - omitting them returns all records with all fields.

## Example

```typescript
// Export specific fields for records matching a filter
const options: ExportRecordsOptions = {
  fields: ['record_id', 'first_name', 'last_name', 'email'],
  filterLogic: '[age] >= 18',
  rawOrLabel: 'label', // Get labels instead of raw codes
};

const records = await Effect.runPromise(
  client.exportRecords<{ record_id: string; first_name: string }>(options)
);
```

## See

- [RedcapClient.exportRecords](RedcapClient.md#exportrecords) - Method that uses this type
- [escapeFilterLogicValue](../functions/escapeFilterLogicValue.md) - Utility for safely escaping filterLogic values

## Properties

### fields?

> `readonly` `optional` **fields**: readonly `string`[]

Defined in: [packages/redcap-api/src/types.ts:208](https://github.com/univ-lehavre/atlas/blob/efca797d113c12556abf22a7fdb97dae8aa62ade/packages/redcap-api/src/types.ts#L208)

List of field names to include; omit for all fields

---

### filterLogic?

> `readonly` `optional` **filterLogic**: `string`

Defined in: [packages/redcap-api/src/types.ts:215](https://github.com/univ-lehavre/atlas/blob/efca797d113c12556abf22a7fdb97dae8aa62ade/packages/redcap-api/src/types.ts#L215)

REDCap filter logic expression (e.g., '[age] >= 18 AND [consent] = "1"').
Use [escapeFilterLogicValue](../functions/escapeFilterLogicValue.md) when including user input.

---

### forms?

> `readonly` `optional` **forms**: readonly `string`[]

Defined in: [packages/redcap-api/src/types.ts:210](https://github.com/univ-lehavre/atlas/blob/efca797d113c12556abf22a7fdb97dae8aa62ade/packages/redcap-api/src/types.ts#L210)

List of form/instrument names to include; omit for all forms

---

### rawOrLabel?

> `readonly` `optional` **rawOrLabel**: `"raw"` \| `"label"`

Defined in: [packages/redcap-api/src/types.ts:227](https://github.com/univ-lehavre/atlas/blob/efca797d113c12556abf22a7fdb97dae8aa62ade/packages/redcap-api/src/types.ts#L227)

Value format for choice fields:

- 'raw': Return coded values (e.g., '1', '2')
- 'label': Return display labels (e.g., 'Yes', 'No')

---

### type?

> `readonly` `optional` **type**: `"flat"` \| `"eav"`

Defined in: [packages/redcap-api/src/types.ts:221](https://github.com/univ-lehavre/atlas/blob/efca797d113c12556abf22a7fdb97dae8aa62ade/packages/redcap-api/src/types.ts#L221)

Export format:

- 'flat': One row per record (default)
- 'eav': Entity-Attribute-Value format (one row per data point)
