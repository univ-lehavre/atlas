# Interface: RedcapInstrument

Defined in: [packages/redcap-api/src/types.ts:93](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L93)

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

> `readonly` **instrument_label**: `string`

Defined in: [packages/redcap-api/src/types.ts:97](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L97)

Human-readable display label (e.g., 'Demographics Form')

---

### instrument_name

> `readonly` **instrument_name**: `string`

Defined in: [packages/redcap-api/src/types.ts:95](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L95)

Internal name used in the API (lowercase, underscores, e.g., 'demographics')
