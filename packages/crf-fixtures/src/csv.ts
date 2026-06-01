/**
 * CRF data-dictionary CSV parser.
 *
 * Parses the standard CSV export of a clinical research form (CRF) data
 * dictionary into a typed structure. The export uses human-readable column
 * headers (e.g. `"Variable / Field Name"`) which this module maps to the
 * canonical snake_case keys used by the CRF API (`field_name`, `form_name`,
 * `field_type`, …).
 *
 * The parser is robust to optional columns: any header not present in the
 * source CSV simply yields an absent property on the resulting field.
 */

import { parse } from 'csv-parse/sync';
import type { FieldType } from '@univ-lehavre/atlas-crf-core/types';

/** A single parsed choice of a categorical field (dropdown / radio / checkbox). */
export interface FieldChoice {
  /** Raw coded value stored in records (e.g. `"1"`). */
  readonly code: string;
  /** Human-readable label shown to users (e.g. `"Option One"`). */
  readonly label: string;
}

/**
 * A field (variable) definition parsed from a CRF data dictionary.
 *
 * Mirrors the canonical CRF metadata shape. Optional dictionary columns are
 * omitted when absent or blank in the source CSV.
 */
export interface DictionaryField {
  readonly field_name: string;
  readonly form_name: string;
  readonly field_type: FieldType;
  readonly field_label: string;
  readonly section_header?: string;
  readonly select_choices_or_calculations?: string;
  readonly field_note?: string;
  readonly text_validation_type_or_show_slider_number?: string;
  readonly text_validation_min?: string;
  readonly text_validation_max?: string;
  readonly identifier?: string;
  readonly branching_logic?: string;
  readonly required_field?: string;
  readonly custom_alignment?: string;
  readonly question_number?: string;
  readonly matrix_group_name?: string;
  readonly matrix_ranking?: string;
  readonly field_annotation?: string;
}

/** A parsed CRF data dictionary: an ordered list of field definitions. */
export interface Dictionary {
  readonly fields: readonly DictionaryField[];
}

/** Error thrown when a data dictionary CSV cannot be parsed. */
export class DictionaryParseError extends Error {
  override readonly name = 'DictionaryParseError';
}

/** Known CRF field types (mirror of the canonical CRF vocabulary). */
const FIELD_TYPES: ReadonlySet<string> = new Set<FieldType>([
  'text',
  'notes',
  'calc',
  'dropdown',
  'radio',
  'checkbox',
  'yesno',
  'truefalse',
  'file',
  'slider',
  'descriptive',
  'sql',
]);

/**
 * Mapping from human-readable dictionary headers to canonical snake_case keys.
 *
 * Headers are matched after normalisation (lower-cased, punctuation removed),
 * so cosmetic variations in spacing/casing in the export do not break parsing.
 */
const HEADER_ALIASES: Readonly<Record<string, keyof DictionaryField>> = {
  'variable / field name': 'field_name',
  'variable field name': 'field_name',
  field_name: 'field_name',
  'form name': 'form_name',
  form_name: 'form_name',
  'section header': 'section_header',
  section_header: 'section_header',
  'field type': 'field_type',
  field_type: 'field_type',
  'field label': 'field_label',
  field_label: 'field_label',
  'choices calculations or slider labels': 'select_choices_or_calculations',
  select_choices_or_calculations: 'select_choices_or_calculations',
  'field note': 'field_note',
  field_note: 'field_note',
  'text validation type or show slider number': 'text_validation_type_or_show_slider_number',
  text_validation_type_or_show_slider_number: 'text_validation_type_or_show_slider_number',
  'text validation min': 'text_validation_min',
  text_validation_min: 'text_validation_min',
  'text validation max': 'text_validation_max',
  text_validation_max: 'text_validation_max',
  identifier: 'identifier',
  'branching logic show field only if': 'branching_logic',
  branching_logic: 'branching_logic',
  'required field': 'required_field',
  required_field: 'required_field',
  'custom alignment': 'custom_alignment',
  custom_alignment: 'custom_alignment',
  'question number surveys only': 'question_number',
  question_number: 'question_number',
  'matrix group name': 'matrix_group_name',
  matrix_group_name: 'matrix_group_name',
  'matrix ranking': 'matrix_ranking',
  matrix_ranking: 'matrix_ranking',
  'field annotation': 'field_annotation',
  field_annotation: 'field_annotation',
};

/** Keys that are always present on a parsed field (non-optional). */
const REQUIRED_KEYS = ['field_name', 'form_name', 'field_type', 'field_label'] as const;

/** Normalise a raw header into its lookup key (lower-case, no punctuation). */
const normaliseHeader = (header: string): string =>
  header
    .toLowerCase()
    .replaceAll('?', '')
    .replaceAll(/[/(),]/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();

/** Resolve a raw header to its canonical key, or `undefined` if unknown. */
const canonicalKey = (header: string): keyof DictionaryField | undefined =>
  HEADER_ALIASES[normaliseHeader(header)];

const isFieldType = (value: string): value is FieldType => FIELD_TYPES.has(value);

/**
 * Parse the `select_choices_or_calculations` cell of a categorical field.
 *
 * The CRF export encodes choices as `"<code>, <label> | <code>, <label>"`.
 * Returns an empty array for blank cells or for non-categorical fields whose
 * cell holds a calculation/slider-label string rather than coded choices.
 */
export const parseChoices = (raw?: string): readonly FieldChoice[] => {
  if (!raw || raw.trim().length === 0) return [];
  return raw
    .split('|')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      const comma = segment.indexOf(',');
      if (comma === -1) return { code: segment, label: segment };
      return {
        code: segment.slice(0, comma).trim(),
        label: segment.slice(comma + 1).trim(),
      };
    });
};

/** Build a typed field from a raw CSV record keyed by canonical column names. */
const toField = (record: Readonly<Record<string, string>>, rowIndex: number): DictionaryField => {
  const get = (key: keyof DictionaryField): string =>
    // eslint-disable-next-line security/detect-object-injection -- key is a fixed DictionaryField key
    (record[key] ?? '').trim();

  for (const key of REQUIRED_KEYS) {
    if (get(key).length === 0) {
      throw new DictionaryParseError(
        `Row ${String(rowIndex + 1)}: missing required column "${key}"`
      );
    }
  }

  const fieldType = get('field_type');
  if (!isFieldType(fieldType)) {
    throw new DictionaryParseError(
      `Row ${String(rowIndex + 1)}: unknown field_type "${fieldType}" for field "${get('field_name')}"`
    );
  }

  const base: DictionaryField = {
    field_name: get('field_name'),
    form_name: get('form_name'),
    field_type: fieldType,
    field_label: get('field_label'),
  };

  const optionalKeys: readonly (keyof DictionaryField)[] = [
    'section_header',
    'select_choices_or_calculations',
    'field_note',
    'text_validation_type_or_show_slider_number',
    'text_validation_min',
    'text_validation_max',
    'identifier',
    'branching_logic',
    'required_field',
    'custom_alignment',
    'question_number',
    'matrix_group_name',
    'matrix_ranking',
    'field_annotation',
  ];

  const optional: Record<string, string> = {};
  for (const key of optionalKeys) {
    const value = get(key);
    // eslint-disable-next-line security/detect-object-injection -- key comes from a fixed DictionaryField key list
    if (value.length > 0) optional[key] = value;
  }

  return { ...base, ...optional };
};

/**
 * Parse a CRF data-dictionary CSV into a typed {@link Dictionary}.
 *
 * Accepts both the verbose export headers (`"Variable / Field Name"`, …) and
 * the canonical snake_case headers (`field_name`, …). Unknown columns are
 * ignored; optional columns may be absent. Throws {@link DictionaryParseError}
 * on malformed CSV or on rows missing a required column / carrying an unknown
 * field type.
 */
/** Parse the raw CSV into header-keyed rows, wrapping any error. */
const parseRows = (content: string): Record<string, string>[] => {
  try {
    return parse(content, {
      bom: true,
      columns: (headers: string[]) =>
        headers.map((header) => canonicalKey(header) ?? `__ignored_${header}`),
      skip_empty_lines: true,
      relax_column_count: true,
    });
  } catch (error) {
    throw new DictionaryParseError('Failed to parse data dictionary CSV', { cause: error });
  }
};

export const parseDictionary = (content: string): Dictionary => ({
  fields: parseRows(content).map((row, index) => toField(row, index)),
});
