/**
 * REDCap version-related errors
 */

import { Data } from 'effect';

/** Error parsing a version string */
export class VersionParseError extends Data.TaggedError('VersionParseError')<{
  readonly input: string;
}> {
  override get message(): string {
    return `Invalid version format: "${this.input}". Expected format: X.Y.Z`;
  }
}

/** Error when REDCap version is not supported */
export class UnsupportedVersionError extends Data.TaggedError('UnsupportedVersionError')<{
  readonly version: string;
  readonly minVersion?: string;
  readonly maxVersion?: string;
}> {
  override get message(): string {
    if (this.minVersion && this.maxVersion) {
      return `REDCap version ${this.version} is not supported. Supported range: ${this.minVersion} - ${this.maxVersion}`;
    }
    if (this.minVersion) {
      return `REDCap version ${this.version} is too old. Minimum required: ${this.minVersion}`;
    }
    if (this.maxVersion) {
      return `REDCap version ${this.version} is too new. Maximum supported: ${this.maxVersion}`;
    }
    return `REDCap version ${this.version} is not supported`;
  }
}
