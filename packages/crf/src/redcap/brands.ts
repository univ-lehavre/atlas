/**
 * @module brands
 * @description Branded types for REDCap API.
 *
 * These provide runtime validation on top of the OpenAPI-generated types.
 * The patterns match those defined in specs/redcap.yaml.
 */
import { Brand } from 'effect';
import { SafeApiUrl } from '@univ-lehavre/atlas-net';

// ============================================================================
// RedcapUrl - reuses SafeApiUrl from atlas-net
// ============================================================================

/**
 * Branded type for REDCap API URL.
 * Alias for SafeApiUrl from @univ-lehavre/atlas-net.
 */
export type RedcapUrl = SafeApiUrl;
export const RedcapUrl = SafeApiUrl;

// ============================================================================
// RedcapToken - 32 uppercase hex characters
// Pattern: ^[A-F0-9]{32}$
// ============================================================================

export type RedcapToken = string & Brand.Brand<'RedcapToken'>;

export const RedcapToken = Brand.refined<RedcapToken>(
  (token) => /^[A-F0-9]{32}$/.test(token),
  () => Brand.error('Invalid REDCap token: must be a 32-character uppercase hexadecimal string')
);

// ============================================================================
// RecordId - lowercase alphanumeric, at least 20 characters
// Pattern: ^[a-z0-9]{20,}$
// ============================================================================

export type RecordId = string & Brand.Brand<'RecordId'>;

export const RecordId = Brand.refined<RecordId>(
  (id) => /^[a-z0-9]{20,}$/.test(id),
  (id) =>
    Brand.error(
      `Invalid Record ID: "${id}" must be a lowercase alphanumeric string of at least 20 characters`
    )
);

// ============================================================================
// InstrumentName - starts with lowercase, contains lowercase, digits, underscores
// Pattern: ^[a-z][a-z0-9_]*$
// ============================================================================

export type InstrumentName = string & Brand.Brand<'InstrumentName'>;

export const InstrumentName = Brand.refined<InstrumentName>(
  (name) => /^[a-z][a-z0-9_]*$/.test(name),
  (name) => Brand.error(`Invalid instrument name: "${name}" must be lowercase with underscores`)
);

// ============================================================================
// Email - standard email pattern
// Pattern: ^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$
// ============================================================================

export type Email = string & Brand.Brand<'Email'>;

export const Email = Brand.refined<Email>(
  (email) => /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(email),
  (email) => Brand.error(`Invalid email: "${email}" must be a valid email address`)
);

// ============================================================================
// Additional utility types (not in OpenAPI but useful)
// ============================================================================

export type UserId = string & Brand.Brand<'UserId'>;

export const UserId = Brand.refined<UserId>(
  (id) => /^\w+$/.test(id),
  (id) =>
    Brand.error(
      `Invalid User ID: "${id}" must contain only alphanumeric characters and underscores`
    )
);

export type PositiveInt = number & Brand.Brand<'PositiveInt'>;

export const PositiveInt = Brand.refined<PositiveInt>(
  (n) => Number.isInteger(n) && n >= 1,
  (n) => Brand.error(`Invalid positive integer: ${String(n)} must be an integer >= 1`)
);

export type NonEmptyString = string & Brand.Brand<'NonEmptyString'>;

export const NonEmptyString = Brand.refined<NonEmptyString>(
  (s) => s.length > 0,
  () => Brand.error('Invalid string: must not be empty')
);

const isValidIsoTimestamp = (ts: string): boolean => {
  // eslint-disable-next-line security/detect-unsafe-regex
  const isoPattern = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})?)?$/;
  const isValidFormat = isoPattern.test(ts);
  const date = new Date(ts.replace(' ', 'T'));
  return isValidFormat && !Number.isNaN(date.getTime());
};

export type IsoTimestamp = string & Brand.Brand<'IsoTimestamp'>;

export const IsoTimestamp = Brand.refined<IsoTimestamp>(isValidIsoTimestamp, (ts) =>
  Brand.error(`Invalid timestamp: "${ts}" must be a valid ISO 8601 date/datetime`)
);

export type BooleanFlag = (0 | 1) & Brand.Brand<'BooleanFlag'>;

export const BooleanFlag = Brand.refined<BooleanFlag>(
  (n) => n === 0 || n === 1,
  (n) => Brand.error(`Invalid boolean flag: ${String(n)} must be 0 or 1`)
);
