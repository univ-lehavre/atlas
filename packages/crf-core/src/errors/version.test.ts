/**
 * @module errors/version.test
 * @description Tests for REDCap version-related errors
 */

import { describe, it, expect } from 'vitest';
import { VersionParseError, UnsupportedVersionError } from './version.js';

describe('VersionParseError', () => {
  describe('constructor', () => {
    it('should create error with input', () => {
      const error = new VersionParseError({ input: 'invalid' });
      expect(error.input).toBe('invalid');
    });
  });

  describe('message', () => {
    it('should format message with input', () => {
      const error = new VersionParseError({ input: 'not-a-version' });
      expect(error.message).toBe('Invalid version format: "not-a-version". Expected format: X.Y.Z');
    });

    it('should handle empty input', () => {
      const error = new VersionParseError({ input: '' });
      expect(error.message).toBe('Invalid version format: "". Expected format: X.Y.Z');
    });
  });

  describe('_tag', () => {
    it('should have correct tag', () => {
      const error = new VersionParseError({ input: 'test' });
      expect(error._tag).toBe('VersionParseError');
    });
  });
});

describe('UnsupportedVersionError', () => {
  describe('constructor', () => {
    it('should create error with version only', () => {
      const error = new UnsupportedVersionError({ version: '13.0.0' });
      expect(error.version).toBe('13.0.0');
      expect(error.minVersion).toBeUndefined();
      expect(error.maxVersion).toBeUndefined();
    });

    it('should create error with minVersion', () => {
      const error = new UnsupportedVersionError({ version: '13.0.0', minVersion: '14.0.0' });
      expect(error.minVersion).toBe('14.0.0');
    });

    it('should create error with maxVersion', () => {
      const error = new UnsupportedVersionError({ version: '17.0.0', maxVersion: '16.0.8' });
      expect(error.maxVersion).toBe('16.0.8');
    });

    it('should create error with both min and max versions', () => {
      const error = new UnsupportedVersionError({
        version: '13.0.0',
        minVersion: '14.0.0',
        maxVersion: '16.0.8',
      });
      expect(error.minVersion).toBe('14.0.0');
      expect(error.maxVersion).toBe('16.0.8');
    });
  });

  describe('message', () => {
    it('should format message with version only', () => {
      const error = new UnsupportedVersionError({ version: '13.0.0' });
      expect(error.message).toBe('REDCap version 13.0.0 is not supported');
    });

    it('should format message with minVersion only', () => {
      const error = new UnsupportedVersionError({ version: '13.0.0', minVersion: '14.0.0' });
      expect(error.message).toBe('REDCap version 13.0.0 is too old. Minimum required: 14.0.0');
    });

    it('should format message with maxVersion only', () => {
      const error = new UnsupportedVersionError({ version: '17.0.0', maxVersion: '16.0.8' });
      expect(error.message).toBe('REDCap version 17.0.0 is too new. Maximum supported: 16.0.8');
    });

    it('should format message with both min and max versions', () => {
      const error = new UnsupportedVersionError({
        version: '13.0.0',
        minVersion: '14.0.0',
        maxVersion: '16.0.8',
      });
      expect(error.message).toBe(
        'REDCap version 13.0.0 is not supported. Supported range: 14.0.0 - 16.0.8'
      );
    });
  });

  describe('_tag', () => {
    it('should have correct tag', () => {
      const error = new UnsupportedVersionError({ version: '13.0.0' });
      expect(error._tag).toBe('UnsupportedVersionError');
    });
  });
});
