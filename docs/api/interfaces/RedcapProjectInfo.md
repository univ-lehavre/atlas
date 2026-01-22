[**@univ-lehavre/atlas-redcap-api**](../README.md)

---

[@univ-lehavre/atlas-redcap-api](../README.md) / RedcapProjectInfo

# Interface: RedcapProjectInfo

Defined in: [packages/redcap-api/src/types.ts:64](https://github.com/univ-lehavre/atlas/blob/efca797d113c12556abf22a7fdb97dae8aa62ade/packages/redcap-api/src/types.ts#L64)

REDCap project information returned by the API.

Contains metadata about a REDCap project including its ID, title,
creation timestamp, and configuration flags.

## Example

```typescript
const info = await Effect.runPromise(client.getProjectInfo());
console.log(`Project: ${info.project_title} (ID: ${info.project_id})`);
console.log(`In production: ${info.in_production === 1}`);
```

## See

[RedcapClient.getProjectInfo](RedcapClient.md#getprojectinfo) - Method that returns this type

## Properties

### creation_time

> `readonly` **creation_time**: `string`

Defined in: [packages/redcap-api/src/types.ts:70](https://github.com/univ-lehavre/atlas/blob/efca797d113c12556abf22a7fdb97dae8aa62ade/packages/redcap-api/src/types.ts#L70)

ISO 8601 timestamp when the project was created

---

### in_production

> `readonly` **in_production**: `0` \| `1`

Defined in: [packages/redcap-api/src/types.ts:72](https://github.com/univ-lehavre/atlas/blob/efca797d113c12556abf22a7fdb97dae8aa62ade/packages/redcap-api/src/types.ts#L72)

Whether the project is in production mode (1) or development mode (0)

---

### project_id

> `readonly` **project_id**: `number`

Defined in: [packages/redcap-api/src/types.ts:66](https://github.com/univ-lehavre/atlas/blob/efca797d113c12556abf22a7fdb97dae8aa62ade/packages/redcap-api/src/types.ts#L66)

Unique identifier for the project in REDCap

---

### project_title

> `readonly` **project_title**: `string`

Defined in: [packages/redcap-api/src/types.ts:68](https://github.com/univ-lehavre/atlas/blob/efca797d113c12556abf22a7fdb97dae8aa62ade/packages/redcap-api/src/types.ts#L68)

Human-readable title of the project

---

### record_autonumbering_enabled

> `readonly` **record_autonumbering_enabled**: `0` \| `1`

Defined in: [packages/redcap-api/src/types.ts:74](https://github.com/univ-lehavre/atlas/blob/efca797d113c12556abf22a7fdb97dae8aa62ade/packages/redcap-api/src/types.ts#L74)

Whether automatic record numbering is enabled (1) or disabled (0)
