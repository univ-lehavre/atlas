[**@univ-lehavre/atlas-redcap-api**](../index.md)

---

[@univ-lehavre/atlas-redcap-api](../index.md) / ImportRecordsOptions

# Interface: ImportRecordsOptions

Defined in: [packages/redcap-api/src/types.ts:252](https://github.com/univ-lehavre/atlas/blob/9f020e0b970df818d41e1532805b25c2cea7c1b7/packages/redcap-api/src/types.ts#L252)

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

Defined in: [packages/redcap-api/src/types.ts:258](https://github.com/univ-lehavre/atlas/blob/9f020e0b970df818d41e1532805b25c2cea7c1b7/packages/redcap-api/src/types.ts#L258)

How to handle existing data:

- 'normal': Only overwrite fields that have new values (default)
- 'overwrite': Overwrite all fields, setting blank fields to empty

---

### returnContent?

> `readonly` `optional` **returnContent**: `"count"` \| `"ids"` \| `"auto_ids"`

Defined in: [packages/redcap-api/src/types.ts:265](https://github.com/univ-lehavre/atlas/blob/9f020e0b970df818d41e1532805b25c2cea7c1b7/packages/redcap-api/src/types.ts#L265)

What to return after import:

- 'count': Return count of imported records (default)
- 'ids': Return list of record IDs that were imported
- 'auto_ids': Return auto-generated record IDs (if autonumbering enabled)
