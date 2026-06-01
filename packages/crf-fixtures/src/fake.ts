/**
 * Deterministic fake-record generator.
 *
 * Generates fake CRF records consistent with a parsed data {@link Dictionary},
 * for use as test fixtures. Generation is fully deterministic: given the same
 * dictionary, seed and options, it always produces the same records. No
 * unseeded `Math.random` is used, so output is reproducible across runs and
 * machines.
 */

import { parseChoices } from './csv.js';
import type { Dictionary, DictionaryField } from './csv.js';

/** A generated record: a flat map of exported field name → cell value. */
export type FakeRecord = Record<string, string>;

/** Options controlling fake-record generation. */
export interface GenerateOptions {
  /** Number of records to generate. Defaults to `1`. */
  readonly count?: number;
  /** Seed for the deterministic PRNG. Defaults to `1`. */
  readonly seed?: number;
  /**
   * Name of the record-identifier field. When set and present in the
   * dictionary, this field receives a sequential id (`"1"`, `"2"`, …) instead
   * of a generated value. Defaults to the first field of the dictionary.
   */
  readonly recordIdField?: string;
  /**
   * When `true`, optional (non-required, non-id) fields are left empty for a
   * subset of records, mimicking sparse real-world data. Defaults to `false`
   * (every field is filled). The pattern is deterministic.
   */
  readonly sparse?: boolean;
}

/**
 * A small, fast, deterministic PRNG (mulberry32).
 *
 * Returns a function yielding floats in `[0, 1)`. Used instead of `Math.random`
 * so fixtures are reproducible.
 */
const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

/** Pick a deterministic element from a non-empty array. */
const pick = <T>(rand: () => number, items: readonly T[]): T => {
  const index = Math.floor(rand() * items.length);
  // eslint-disable-next-line security/detect-object-injection -- index is bounded by items.length
  return items[index] as T;
};

/** Integer in `[min, max]` inclusive. */
const randInt = (rand: () => number, min: number, max: number): number =>
  min + Math.floor(rand() * (max - min + 1));

const WORDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'] as const;

/** Generate a deterministic free-text value. */
const fakeText = (rand: () => number): string =>
  `${pick(rand, WORDS)}-${String(randInt(rand, 100, 999))}`;

/** Generate a deterministic ISO date (`YYYY-MM-DD`) within a fixed range. */
const fakeDate = (rand: () => number): string => {
  const year = String(randInt(rand, 2020, 2025));
  const month = String(randInt(rand, 1, 12)).padStart(2, '0');
  const day = String(randInt(rand, 1, 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Whether a validation hint denotes a date/datetime field. */
const isDateValidation = (validation: string | undefined): boolean =>
  validation?.startsWith('date') ?? false;

/** Whether a validation hint denotes an integer field. */
const isIntegerValidation = (validation: string | undefined): boolean =>
  validation === 'integer' || validation === 'number';

/** Pick a coded value for a single-choice (dropdown / radio) field. */
const generateChoiceValue = (rand: () => number, field: DictionaryField): string => {
  const choices = parseChoices(field.select_choices_or_calculations);
  return choices.length > 0 ? pick(rand, choices).code : '';
};

/** Generate a value for a free-text field, honouring its validation hint. */
const generateTextValue = (rand: () => number, field: DictionaryField): string => {
  const validation = field.text_validation_type_or_show_slider_number;
  if (isDateValidation(validation)) return fakeDate(rand);
  if (isIntegerValidation(validation)) return String(randInt(rand, 1, 100));
  return fakeText(rand);
};

/**
 * Generate a single cell value for a field, consistent with its type.
 *
 * For checkbox fields a `___<code>` suffixed pseudo-name is not emitted here;
 * checkbox values are expanded by {@link expandCheckbox}. This returns the
 * value for the base field only (empty for checkbox). `calc`, `descriptive`,
 * `file` and `sql` fields never carry imported data and resolve to `''`.
 */
const generateValue = (rand: () => number, field: DictionaryField): string => {
  switch (field.field_type) {
    case 'dropdown':
    case 'radio': {
      return generateChoiceValue(rand, field);
    }
    case 'yesno':
    case 'truefalse': {
      return pick(rand, ['0', '1']);
    }
    case 'slider': {
      return String(randInt(rand, 0, 100));
    }
    case 'notes': {
      return `${fakeText(rand)} ${fakeText(rand)}`;
    }
    case 'text': {
      return generateTextValue(rand, field);
    }
    case 'calc':
    case 'descriptive':
    case 'file':
    case 'sql':
    case 'checkbox': {
      return '';
    }
  }
};

/**
 * Expand a checkbox field into its per-choice `field___code` columns.
 *
 * Each choice column holds `"1"` (checked) or `"0"` (unchecked), chosen
 * deterministically.
 */
const expandCheckbox = (
  rand: () => number,
  field: DictionaryField
): readonly (readonly [string, string])[] =>
  parseChoices(field.select_choices_or_calculations).map((choice) => [
    `${field.field_name}___${choice.code}`,
    pick(rand, ['0', '1']),
  ]);

/** Fields that never hold record data and are skipped during generation. */
const isDataField = (field: DictionaryField): boolean => field.field_type !== 'descriptive';

/**
 * Generate deterministic fake records for a {@link Dictionary}.
 *
 * @example
 * ```ts
 * const records = generateRecords(dictionary, { count: 3, seed: 42 });
 * ```
 */
export const generateRecords = (
  dictionary: Dictionary,
  options: GenerateOptions = {}
): readonly FakeRecord[] => {
  const { count = 1, seed = 1, sparse = false } = options;
  const fields = dictionary.fields.filter(isDataField);
  const recordIdField = options.recordIdField ?? fields[0]?.field_name;

  const records: FakeRecord[] = [];
  for (let row = 0; row < count; row++) {
    // Per-row seed keeps each record reproducible and independent of count.
    const rand = mulberry32(seed + row * 0x9e_37_79_b1);
    const record: FakeRecord = {};

    for (const field of fields) {
      if (field.field_name === recordIdField) {
        // eslint-disable-next-line security/detect-object-injection -- recordIdField is a validated field name from the dictionary
        record[recordIdField] = String(row + 1);
        continue;
      }

      // Deterministically blank out some optional fields when sparse.
      const skip = sparse && rand() < 0.3;

      if (field.field_type === 'checkbox') {
        for (const [name, value] of expandCheckbox(rand, field)) {
          // eslint-disable-next-line security/detect-object-injection -- name is `${field_name}___${code}`, derived from the dictionary
          record[name] = skip ? '0' : value;
        }
        continue;
      }

      record[field.field_name] = skip ? '' : generateValue(rand, field);
    }

    records.push(record);
  }

  return records;
};

/** Convenience: generate a single fake record. */
export const generateRecord = (
  dictionary: Dictionary,
  options: Omit<GenerateOptions, 'count'> = {}
): FakeRecord => {
  const [record] = generateRecords(dictionary, { ...options, count: 1 });
  return record ?? {};
};
