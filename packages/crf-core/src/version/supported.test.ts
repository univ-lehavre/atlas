import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_VERSIONS,
  MIN_SUPPORTED_VERSION,
  LATEST_KNOWN_VERSION,
  PROJECT_SETTINGS_MIN_VERSION,
  FILE_INFO_MIN_VERSION,
} from './supported.js';

describe('SUPPORTED_VERSIONS', () => {
  it('includes known versions', () => {
    expect(SUPPORTED_VERSIONS).toContain('14.5.10');
    expect(SUPPORTED_VERSIONS).toContain('15.5.32');
    expect(SUPPORTED_VERSIONS).toContain('16.0.8');
  });
});

describe('version constants', () => {
  it('MIN_SUPPORTED_VERSION is 14.0.0', () => {
    expect(MIN_SUPPORTED_VERSION.major).toBe(14);
    expect(MIN_SUPPORTED_VERSION.minor).toBe(0);
    expect(MIN_SUPPORTED_VERSION.patch).toBe(0);
  });

  it('LATEST_KNOWN_VERSION is 16.0.8', () => {
    expect(LATEST_KNOWN_VERSION.major).toBe(16);
    expect(LATEST_KNOWN_VERSION.patch).toBe(8);
  });

  it('PROJECT_SETTINGS_MIN_VERSION is 15.0.0', () => {
    expect(PROJECT_SETTINGS_MIN_VERSION.major).toBe(15);
    expect(PROJECT_SETTINGS_MIN_VERSION.minor).toBe(0);
  });

  it('FILE_INFO_MIN_VERSION is 16.0.0', () => {
    expect(FILE_INFO_MIN_VERSION.major).toBe(16);
    expect(FILE_INFO_MIN_VERSION.minor).toBe(0);
    expect(FILE_INFO_MIN_VERSION.patch).toBe(0);
  });
});
