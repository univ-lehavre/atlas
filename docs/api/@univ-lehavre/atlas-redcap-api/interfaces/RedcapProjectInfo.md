# Interface: RedcapProjectInfo

Defined in: [packages/redcap-api/src/types.ts:475](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L475)

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

> `readonly` **creation_time**: [`IsoTimestamp`](../type-aliases/IsoTimestamp.md)

Defined in: [packages/redcap-api/src/types.ts:481](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L481)

ISO 8601 timestamp when the project was created

---

### in_production

> `readonly` **in_production**: [`BooleanFlag`](../type-aliases/BooleanFlag.md)

Defined in: [packages/redcap-api/src/types.ts:483](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L483)

Whether the project is in production mode (1) or development mode (0)

---

### project_id

> `readonly` **project_id**: [`PositiveInt`](../type-aliases/PositiveInt.md)

Defined in: [packages/redcap-api/src/types.ts:477](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L477)

Unique identifier for the project in REDCap

---

### project_title

> `readonly` **project_title**: [`NonEmptyString`](../type-aliases/NonEmptyString.md)

Defined in: [packages/redcap-api/src/types.ts:479](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L479)

Human-readable title of the project

---

### record_autonumbering_enabled

> `readonly` **record_autonumbering_enabled**: [`BooleanFlag`](../type-aliases/BooleanFlag.md)

Defined in: [packages/redcap-api/src/types.ts:485](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L485)

Whether automatic record numbering is enabled (1) or disabled (0)
