/**
 * `@univ-lehavre/atlas-crf-fixtures`
 *
 * CRF data-dictionary CSV parser and deterministic fake-record generator,
 * for building test fixtures from a CRF data dictionary export.
 */

export {
  parseDictionary,
  parseChoices,
  DictionaryParseError,
  type Dictionary,
  type DictionaryField,
  type FieldChoice,
} from './csv.js';

export { generateRecords, generateRecord, type FakeRecord, type GenerateOptions } from './fake.js';
