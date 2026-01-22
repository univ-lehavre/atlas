# Interface: RedcapExportFieldName

Defined in: [packages/redcap-api/src/types.ts:174](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/redcap-api/src/types.ts#L174)

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

Defined in: [packages/redcap-api/src/types.ts:178](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/redcap-api/src/types.ts#L178)

For checkbox fields: the choice value; empty for other field types

---

### export_field_name

> `readonly` **export_field_name**: `string`

Defined in: [packages/redcap-api/src/types.ts:180](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/redcap-api/src/types.ts#L180)

The actual column name used in exports (e.g., 'symptoms\_\_\_1')

---

### original_field_name

> `readonly` **original_field_name**: `string`

Defined in: [packages/redcap-api/src/types.ts:176](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/redcap-api/src/types.ts#L176)

Original field name from the data dictionary
