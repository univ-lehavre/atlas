# Interface: RedcapInstrument

Defined in: [packages/redcap-api/src/types.ts:504](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L504)

REDCap instrument (form) metadata.

Represents a data collection instrument/form in a REDCap project.
Each project can have multiple instruments.

## Example

```typescript
const instruments = await Effect.runPromise(client.getInstruments());
instruments.forEach((inst) => {
  console.log(`${inst.instrument_label} (${inst.instrument_name})`);
});
```

## See

[RedcapClient.getInstruments](RedcapClient.md#getinstruments) - Method that returns this type

## Properties

### instrument_label

> `readonly` **instrument_label**: [`NonEmptyString`](../type-aliases/NonEmptyString.md)

Defined in: [packages/redcap-api/src/types.ts:508](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L508)

Human-readable display label (e.g., 'Demographics Form')

---

### instrument_name

> `readonly` **instrument_name**: [`InstrumentName`](../type-aliases/InstrumentName.md)

Defined in: [packages/redcap-api/src/types.ts:506](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L506)

Internal name used in the API (lowercase, underscores, e.g., 'demographics')
