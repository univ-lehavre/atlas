# Interface: ImportRecordsOptions

Defined in: [packages/redcap-api/src/types.ts:663](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L663)

Options for importing records into REDCap.

Controls how imported records are handled, including overwrite behavior
and what data is returned after import.

## Example

```typescript
// Import with overwrite and get back record IDs
const options: ImportRecordsOptions = {
  overwriteBehavior: 'overwrite',
  returnContent: 'ids',
};

const result = await Effect.runPromise(client.importRecords(records, options));
console.log(`Imported ${result.count} records`);
```

## See

[RedcapClient.importRecords](RedcapClient.md#importrecords) - Method that uses this type

## Properties

### overwriteBehavior?

> `readonly` `optional` **overwriteBehavior**: `"normal"` \| `"overwrite"`

Defined in: [packages/redcap-api/src/types.ts:669](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L669)

How to handle existing data:

- 'normal': Only overwrite fields that have new values (default)
- 'overwrite': Overwrite all fields, setting blank fields to empty

---

### returnContent?

> `readonly` `optional` **returnContent**: `"count"` \| `"ids"` \| `"auto_ids"`

Defined in: [packages/redcap-api/src/types.ts:676](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L676)

What to return after import:

- 'count': Return count of imported records (default)
- 'ids': Return list of record IDs that were imported
- 'auto_ids': Return auto-generated record IDs (if autonumbering enabled)
