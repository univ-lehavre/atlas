# Interface: RedcapField

Defined in: [packages/redcap-api/src/types.ts:117](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L117)

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

Defined in: [packages/redcap-api/src/types.ts:139](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L139)

Branching logic expression controlling field visibility

---

### custom_alignment

> `readonly` **custom_alignment**: `string`

Defined in: [packages/redcap-api/src/types.ts:143](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L143)

Custom alignment: 'LH', 'LV', 'RH', 'RV', or ''

---

### field_annotation

> `readonly` **field_annotation**: `string`

Defined in: [packages/redcap-api/src/types.ts:151](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L151)

Action tags and other annotations (e.g., '@HIDDEN', '@DEFAULT')

---

### field_label

> `readonly` **field_label**: `string`

Defined in: [packages/redcap-api/src/types.ts:125](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L125)

Display label shown to users

---

### field_name

> `readonly` **field_name**: `string`

Defined in: [packages/redcap-api/src/types.ts:119](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L119)

Unique identifier for the field (variable name)

---

### field_note

> `readonly` **field_note**: `string`

Defined in: [packages/redcap-api/src/types.ts:129](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L129)

Additional note/instructions displayed below the field

---

### field_type

> `readonly` **field_type**: `string`

Defined in: [packages/redcap-api/src/types.ts:123](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L123)

Field type: 'text', 'textarea', 'calc', 'dropdown', 'radio', 'checkbox', etc.

---

### form_name

> `readonly` **form_name**: `string`

Defined in: [packages/redcap-api/src/types.ts:121](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L121)

Name of the instrument/form containing this field

---

### identifier

> `readonly` **identifier**: `string`

Defined in: [packages/redcap-api/src/types.ts:137](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L137)

Whether field contains identifying information: 'y' or ''

---

### matrix_group_name

> `readonly` **matrix_group_name**: `string`

Defined in: [packages/redcap-api/src/types.ts:147](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L147)

Matrix group name if field is part of a matrix

---

### matrix_ranking

> `readonly` **matrix_ranking**: `string`

Defined in: [packages/redcap-api/src/types.ts:149](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L149)

Matrix ranking option

---

### question_number

> `readonly` **question_number**: `string`

Defined in: [packages/redcap-api/src/types.ts:145](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L145)

Question number for display purposes

---

### required_field

> `readonly` **required_field**: `string`

Defined in: [packages/redcap-api/src/types.ts:141](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L141)

Whether field is required: 'y' or ''

---

### select_choices_or_calculations

> `readonly` **select_choices_or_calculations**: `string`

Defined in: [packages/redcap-api/src/types.ts:127](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L127)

For choice fields: pipe-separated values (e.g., '1, Yes | 2, No'); for calc fields: formula

---

### text_validation_max

> `readonly` **text_validation_max**: `string`

Defined in: [packages/redcap-api/src/types.ts:135](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L135)

Maximum allowed value for validated numeric/date fields

---

### text_validation_min

> `readonly` **text_validation_min**: `string`

Defined in: [packages/redcap-api/src/types.ts:133](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L133)

Minimum allowed value for validated numeric/date fields

---

### text_validation_type_or_show_slider_number

> `readonly` **text_validation_type_or_show_slider_number**: `string`

Defined in: [packages/redcap-api/src/types.ts:131](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/types.ts#L131)

Validation type: 'email', 'integer', 'number', 'date_ymd', etc., or slider position
