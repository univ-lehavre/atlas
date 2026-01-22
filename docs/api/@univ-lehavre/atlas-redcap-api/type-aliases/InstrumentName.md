# Type Alias: InstrumentName

> **InstrumentName** = `string` & `Brand.Brand`\<`"InstrumentName"`\>

Defined in: [packages/redcap-api/src/types.ts:181](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L181)

Branded type for REDCap instrument names.

Instrument names follow REDCap's naming convention:

- Must start with a lowercase letter
- Can contain lowercase letters, digits, and underscores
- Typically matches the `instrument_name` field from REDCap metadata

## Example

```typescript
// Valid instrument names
const inst1 = InstrumentName('my_survey');
const inst2 = InstrumentName('demographics');
const inst3 = InstrumentName('visit_1_form');

// Invalid instrument names throw BrandError
InstrumentName('My_Survey'); // uppercase not allowed
InstrumentName('1_survey'); // cannot start with digit
InstrumentName('my-survey'); // hyphens not allowed
InstrumentName(''); // empty string not allowed
```

## Throws

When the instrument name format is invalid
