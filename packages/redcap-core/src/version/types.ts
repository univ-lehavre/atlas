/**
 * Version type definitions
 */

/** Parsed version object */
export interface Version {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

/** Version range specification */
export interface VersionRange {
  readonly min: Version;
  readonly max?: Version;
}
