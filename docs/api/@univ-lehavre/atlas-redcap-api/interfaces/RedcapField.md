# Interface: RedcapField

Defined in: [packages/redcap-api/src/types.ts:528](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L528)

REDCap field metadata from the data dictionary.

Contains complete metadata for a single field in the project's data dictionary.
This includes field type, validation rules, branching logic, and display options.

## Example

```typescript
const fields = await Effect.runPromise(client.getFields());
const requiredFields = fields.filter((f) => f.required_field === 'y');
const emailFields = fields.filter((f) => f.text_validation_type_or_show_slider_number === 'email');
```

## See

[RedcapClient.getFields](RedcapClient.md#getfields) - Method that returns this type

## Properties

### branching_logic

> `readonly` **branching_logic**: `string`

Defined in: [packages/redcap-api/src/types.ts:550](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L550)

Branching logic expression controlling field visibility

---

### custom_alignment

> `readonly` **custom_alignment**: `string`

Defined in: [packages/redcap-api/src/types.ts:554](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L554)

Custom alignment: 'LH', 'LV', 'RH', 'RV', or ''

---

### field_annotation

> `readonly` **field_annotation**: `string`

Defined in: [packages/redcap-api/src/types.ts:562](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L562)

Action tags and other annotations (e.g., '@HIDDEN', '@DEFAULT')

---

### field_label

> `readonly` **field_label**: `string`

Defined in: [packages/redcap-api/src/types.ts:536](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L536)

Display label shown to users

---

### field_name

> `readonly` **field_name**: [`NonEmptyString`](../type-aliases/NonEmptyString.md)

Defined in: [packages/redcap-api/src/types.ts:530](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L530)

Unique identifier for the field (variable name)

---

### field_note

> `readonly` **field_note**: `string`

Defined in: [packages/redcap-api/src/types.ts:540](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L540)

Additional note/instructions displayed below the field

---

### field_type

> `readonly` **field_type**: `string`

Defined in: [packages/redcap-api/src/types.ts:534](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L534)

Field type: 'text', 'textarea', 'calc', 'dropdown', 'radio', 'checkbox', etc.

---

### form_name

> `readonly` **form_name**: [`InstrumentName`](../type-aliases/InstrumentName.md)

Defined in: [packages/redcap-api/src/types.ts:532](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L532)

Name of the instrument/form containing this field

---

### identifier

> `readonly` **identifier**: `string`

Defined in: [packages/redcap-api/src/types.ts:548](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L548)

Whether field contains identifying information: 'y' or ''

---

### matrix_group_name

> `readonly` **matrix_group_name**: `string`

Defined in: [packages/redcap-api/src/types.ts:558](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L558)

Matrix group name if field is part of a matrix

---

### matrix_ranking

> `readonly` **matrix_ranking**: `string`

Defined in: [packages/redcap-api/src/types.ts:560](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L560)

Matrix ranking option

---

### question_number

> `readonly` **question_number**: `string`

Defined in: [packages/redcap-api/src/types.ts:556](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L556)

Question number for display purposes

---

### required_field

> `readonly` **required_field**: `string`

Defined in: [packages/redcap-api/src/types.ts:552](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L552)

Whether field is required: 'y' or ''

---

### select_choices_or_calculations

> `readonly` **select_choices_or_calculations**: `string`

Defined in: [packages/redcap-api/src/types.ts:538](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L538)

For choice fields: pipe-separated values (e.g., '1, Yes | 2, No'); for calc fields: formula

---

### text_validation_max

> `readonly` **text_validation_max**: `string`

Defined in: [packages/redcap-api/src/types.ts:546](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L546)

Maximum allowed value for validated numeric/date fields

---

### text_validation_min

> `readonly` **text_validation_min**: `string`

Defined in: [packages/redcap-api/src/types.ts:544](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L544)

Minimum allowed value for validated numeric/date fields

---

### text_validation_type_or_show_slider_number

> `readonly` **text_validation_type_or_show_slider_number**: `string`

Defined in: [packages/redcap-api/src/types.ts:542](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L542)

Validation type: 'email', 'integer', 'number', 'date_ymd', etc., or slider position
