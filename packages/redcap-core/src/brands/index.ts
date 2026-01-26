/**
 * REDCap branded types
 *
 * Type-safe wrappers for REDCap domain values with runtime validation.
 *
 * Each brand exports both a type (via `type X`) and a validator (via const `X`).
 * Use `typeof X` or import `type { X }` to get just the type.
 */

export * from './token.js';
export * from './record.js';
export * from './instrument.js';
export * from './user.js';
export * from './primitives.js';
