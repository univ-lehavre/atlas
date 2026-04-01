/**
 * @module brands
 * @description Branded types for REDCap API.
 *
 * Re-exports from @univ-lehavre/atlas-redcap-core with CRF-specific additions.
 */
import { SafeApiUrl } from '@univ-lehavre/atlas-net';

// ============================================================================
// Re-exports from redcap-core/brands
// ============================================================================

// Token
export {
  RedcapToken,
  REDCAP_TOKEN_PATTERN,
  isValidToken,
  parseToken,
  generateToken,
} from '@univ-lehavre/atlas-redcap-core/brands';

// Record
export {
  RecordId,
  RECORD_ID_PATTERN,
  isValidRecordId,
  parseRecordId,
} from '@univ-lehavre/atlas-redcap-core/brands';

// Instrument
export {
  InstrumentName,
  INSTRUMENT_NAME_PATTERN,
  isValidInstrumentName,
  parseInstrumentName,
  FieldName,
  FIELD_NAME_PATTERN,
  isValidFieldName,
  parseFieldName,
} from '@univ-lehavre/atlas-redcap-core/brands';

// User
export {
  UserId,
  USER_ID_PATTERN,
  isValidUserId,
  parseUserId,
  Email,
  EMAIL_PATTERN,
  isValidEmail,
  parseEmail,
} from '@univ-lehavre/atlas-redcap-core/brands';

// Primitives
export {
  PositiveInt,
  isPositiveInt,
  parsePositiveInt,
  NonNegativeInt,
  NonEmptyString,
  isNonEmptyString,
  ISO_TIMESTAMP_PATTERN,
  IsoTimestamp,
  isValidIsoTimestamp,
  toBooleanFlag,
  fromBooleanFlag,
} from '@univ-lehavre/atlas-redcap-core/brands';

// Type-only exports
export type { BooleanFlag } from '@univ-lehavre/atlas-redcap-core/brands';

// ============================================================================
// CRF-specific branded types
// ============================================================================

/**
 * Branded type for REDCap API URL.
 * Alias for SafeApiUrl from @univ-lehavre/atlas-net.
 */
export type RedcapUrl = SafeApiUrl;
export const RedcapUrl = SafeApiUrl;
