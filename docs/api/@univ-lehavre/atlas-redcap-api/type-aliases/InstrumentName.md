# Type Alias: InstrumentName

> **InstrumentName** = `string` & `Brand.Brand`\<`"InstrumentName"`\>

Defined in: [packages/redcap-api/src/brands.ts:244](https://github.com/univ-lehavre/atlas/blob/55f9855a424232d94722e95c6c935e435b5354ad/packages/redcap-api/src/brands.ts#L244)

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
