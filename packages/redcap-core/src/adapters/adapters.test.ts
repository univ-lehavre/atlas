/**
 * @module adapters/adapters.test
 * @description Tests for REDCap version adapters
 */

import { describe, it, expect } from 'vitest';
import { Option } from 'effect';
import {
  ADAPTERS,
  selectAdapter,
  getAdapterByName,
  getLatestAdapter,
  isVersionSupported,
} from './select.js';
import { createBaseAdapter, extendAdapter } from './base.js';
import { v14Adapter } from './v14.js';
import { v15Adapter } from './v15.js';
import { v16Adapter } from './v16.js';
import type { Version } from '../version/types.js';

describe('ADAPTERS', () => {
  it('should contain all adapters', () => {
    expect(ADAPTERS).toHaveLength(3);
    expect(ADAPTERS).toContain(v14Adapter);
    expect(ADAPTERS).toContain(v15Adapter);
    expect(ADAPTERS).toContain(v16Adapter);
  });

  it('should be ordered newest first', () => {
    expect(ADAPTERS[0]).toBe(v16Adapter);
    expect(ADAPTERS[1]).toBe(v15Adapter);
    expect(ADAPTERS[2]).toBe(v14Adapter);
  });
});

describe('selectAdapter', () => {
  it('should select v14 adapter for v14 versions', () => {
    // Note: maxVersion is exclusive, so we test values within the valid range
    const versions: Version[] = [
      { major: 14, minor: 0, patch: 0 },
      { major: 14, minor: 5, patch: 10 },
      { major: 14, minor: 50, patch: 0 },
    ];

    for (const version of versions) {
      const result = selectAdapter(version);
      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(result.value.name).toBe('v14');
      }
    }
  });

  it('should select v15 adapter for v15 versions', () => {
    // Note: maxVersion is exclusive, so we test values within the valid range
    const versions: Version[] = [
      { major: 15, minor: 0, patch: 0 },
      { major: 15, minor: 5, patch: 32 },
      { major: 15, minor: 50, patch: 0 },
    ];

    for (const version of versions) {
      const result = selectAdapter(version);
      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(result.value.name).toBe('v15');
      }
    }
  });

  it('should select v16 adapter for v16+ versions', () => {
    const versions: Version[] = [
      { major: 16, minor: 0, patch: 0 },
      { major: 16, minor: 0, patch: 8 },
      { major: 17, minor: 0, patch: 0 },
      { major: 20, minor: 0, patch: 0 },
    ];

    for (const version of versions) {
      const result = selectAdapter(version);
      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(result.value.name).toBe('v16');
      }
    }
  });

  it('should return None for unsupported versions', () => {
    const versions: Version[] = [
      { major: 13, minor: 0, patch: 0 },
      { major: 10, minor: 0, patch: 0 },
      { major: 0, minor: 0, patch: 0 },
    ];

    for (const version of versions) {
      const result = selectAdapter(version);
      expect(Option.isNone(result)).toBe(true);
    }
  });
});

describe('getAdapterByName', () => {
  it('should return adapter by name', () => {
    const v14 = getAdapterByName('v14');
    const v15 = getAdapterByName('v15');
    const v16 = getAdapterByName('v16');

    expect(Option.isSome(v14)).toBe(true);
    expect(Option.isSome(v15)).toBe(true);
    expect(Option.isSome(v16)).toBe(true);

    if (Option.isSome(v14)) expect(v14.value).toBe(v14Adapter);
    if (Option.isSome(v15)) expect(v15.value).toBe(v15Adapter);
    if (Option.isSome(v16)) expect(v16.value).toBe(v16Adapter);
  });

  it('should return None for unknown name', () => {
    expect(Option.isNone(getAdapterByName('v13'))).toBe(true);
    expect(Option.isNone(getAdapterByName('unknown'))).toBe(true);
    expect(Option.isNone(getAdapterByName(''))).toBe(true);
  });
});

describe('getLatestAdapter', () => {
  it('should return v16 adapter', () => {
    expect(getLatestAdapter()).toBe(v16Adapter);
  });
});

describe('isVersionSupported', () => {
  it('should return true for supported versions', () => {
    expect(isVersionSupported({ major: 14, minor: 0, patch: 0 })).toBe(true);
    expect(isVersionSupported({ major: 15, minor: 5, patch: 32 })).toBe(true);
    expect(isVersionSupported({ major: 16, minor: 0, patch: 8 })).toBe(true);
  });

  it('should return false for unsupported versions', () => {
    expect(isVersionSupported({ major: 13, minor: 0, patch: 0 })).toBe(false);
    expect(isVersionSupported({ major: 0, minor: 0, patch: 0 })).toBe(false);
  });
});

describe('v14Adapter', () => {
  it('should have correct name', () => {
    expect(v14Adapter.name).toBe('v14');
  });

  it('should have correct version range', () => {
    expect(v14Adapter.minVersion).toEqual({ major: 14, minor: 0, patch: 0 });
    expect(v14Adapter.maxVersion).toEqual({ major: 14, minor: 99, patch: 99 });
  });

  it('should have correct features', () => {
    const features = v14Adapter.getFeatures();
    expect(features.repeatingInstruments).toBe(true);
    expect(features.dataAccessGroups).toBe(true);
    expect(features.fileRepository).toBe(true);
    expect(features.projectSettings).toBe(false);
    expect(features.fileInfo).toBe(false);
    expect(features.projectXml).toBe(false);
  });

  it('should transform params', () => {
    const result = v14Adapter.transformExportParams({ content: 'record' });
    expect(result.params).toEqual({ content: 'record' });
  });
});

describe('v15Adapter', () => {
  it('should have correct name', () => {
    expect(v15Adapter.name).toBe('v15');
  });

  it('should have correct version range', () => {
    expect(v15Adapter.minVersion).toEqual({ major: 15, minor: 0, patch: 0 });
    expect(v15Adapter.maxVersion).toEqual({ major: 15, minor: 99, patch: 99 });
  });

  it('should have projectSettings enabled', () => {
    const features = v15Adapter.getFeatures();
    expect(features.projectSettings).toBe(true);
    expect(features.fileInfo).toBe(false);
  });
});

describe('v16Adapter', () => {
  it('should have correct name', () => {
    expect(v16Adapter.name).toBe('v16');
  });

  it('should have no max version (open-ended)', () => {
    expect(v16Adapter.minVersion).toEqual({ major: 16, minor: 0, patch: 0 });
    expect(v16Adapter.maxVersion).toBeUndefined();
  });

  it('should have all features enabled', () => {
    const features = v16Adapter.getFeatures();
    expect(features.repeatingInstruments).toBe(true);
    expect(features.dataAccessGroups).toBe(true);
    expect(features.fileRepository).toBe(true);
    expect(features.mycap).toBe(true);
    expect(features.surveyQueue).toBe(true);
    expect(features.alerts).toBe(true);
    expect(features.projectSettings).toBe(true);
    expect(features.fileInfo).toBe(true);
    expect(features.projectXml).toBe(true);
  });
});

describe('createBaseAdapter', () => {
  it('should create adapter with options', () => {
    const adapter = createBaseAdapter({
      name: 'test',
      minVersion: { major: 10, minor: 0, patch: 0 },
      maxVersion: { major: 10, minor: 99, patch: 99 },
      features: {
        repeatingInstruments: true,
        dataAccessGroups: true,
        fileRepository: false,
        mycap: false,
        surveyQueue: false,
        alerts: false,
        projectSettings: false,
        fileInfo: false,
        projectXml: false,
      },
    });

    expect(adapter.name).toBe('test');
    expect(adapter.minVersion).toEqual({ major: 10, minor: 0, patch: 0 });
    expect(adapter.getFeatures().repeatingInstruments).toBe(true);
    expect(adapter.getFeatures().fileRepository).toBe(false);
  });

  it('should support default params', () => {
    const adapter = createBaseAdapter({
      name: 'test',
      minVersion: { major: 10, minor: 0, patch: 0 },
      features: {
        repeatingInstruments: false,
        dataAccessGroups: false,
        fileRepository: false,
        mycap: false,
        surveyQueue: false,
        alerts: false,
        projectSettings: false,
        fileInfo: false,
        projectXml: false,
      },
      defaultParams: { format: 'json' },
    });

    expect(adapter.getDefaultParams()).toEqual({ format: 'json' });
  });
});

describe('extendAdapter', () => {
  it('should extend adapter with overrides', () => {
    const extended = extendAdapter(v14Adapter, {
      transformExportParams: (params) => ({
        params: { ...params, extended: 'true' },
      }),
    });

    expect(extended.name).toBe('v14');
    expect(extended.minVersion).toEqual(v14Adapter.minVersion);

    const result = extended.transformExportParams({ content: 'record' });
    expect(result.params).toEqual({ content: 'record', extended: 'true' });
  });

  it('should preserve non-overridden methods', () => {
    const extended = extendAdapter(v14Adapter, {
      getDefaultParams: () => ({ custom: 'param' }),
    });

    expect(extended.getDefaultParams()).toEqual({ custom: 'param' });
    expect(extended.getFeatures()).toEqual(v14Adapter.getFeatures());
  });
});
