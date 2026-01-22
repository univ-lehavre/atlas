# Interface: RedcapExportFieldName

Defined in: [packages/redcap-api/src/types.ts:585](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L585)

REDCap export field name mapping.

Maps original field names to their export column names. This is particularly
useful for checkbox fields, which expand to multiple columns in exports
(one per choice option).

## Example

```typescript
const fieldNames = await Effect.runPromise(client.getExportFieldNames());

// Checkbox 'symptoms' with options 1,2,3 becomes:
// symptoms___1, symptoms___2, symptoms___3
const symptomColumns = fieldNames
  .filter((f) => f.original_field_name === 'symptoms')
  .map((f) => f.export_field_name);
```

## See

[RedcapClient.getExportFieldNames](RedcapClient.md#getexportfieldnames) - Method that returns this type

## Properties

### choice_value

> `readonly` **choice_value**: `string`

Defined in: [packages/redcap-api/src/types.ts:589](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L589)

For checkbox fields: the choice value; empty for other field types

---

### export_field_name

> `readonly` **export_field_name**: `string`

Defined in: [packages/redcap-api/src/types.ts:591](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L591)

The actual column name used in exports (e.g., 'symptoms\_\_\_1')

---

### original_field_name

> `readonly` **original_field_name**: `string`

Defined in: [packages/redcap-api/src/types.ts:587](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L587)

Original field name from the data dictionary
