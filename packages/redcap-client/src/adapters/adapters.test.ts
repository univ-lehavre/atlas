import { describe, it, expect } from 'vitest';
import { Effect, Option } from 'effect';
import {
  getAdapterEffect,
  getAdapter,
  getSupportedVersionRanges,
  isVersionSupported,
  getMinSupportedVersion,
  getLatestAdapter,
  createBaseAdapter,
  extendAdapter,
} from './index.js';
import { v14Adapter } from './v14.js';
import { v15Adapter } from './v15.js';
import { v16Adapter } from './v16.js';
import type { Version } from '../version.js';
import type { RedcapFeatures, TransformedParams } from './types.js';

describe('Adapters Module', () => {
  describe('getAdapterEffect', () => {
    it('should return v14 adapter for version 14.5.10', async () => {
      const version: Version = { major: 14, minor: 5, patch: 10 };
      const adapter = await Effect.runPromise(getAdapterEffect(version));

      expect(adapter.name).toBe('REDCap 14.x');
      expect(adapter.minVersion).toEqual({ major: 14, minor: 0, patch: 0 });
    });

    it('should return v15 adapter for version 15.5.32', async () => {
      const version: Version = { major: 15, minor: 5, patch: 32 };
      const adapter = await Effect.runPromise(getAdapterEffect(version));

      expect(adapter.name).toBe('REDCap 15.x');
      expect(adapter.minVersion).toEqual({ major: 15, minor: 0, patch: 0 });
    });

    it('should return v16 adapter for version 16.0.8', async () => {
      const version: Version = { major: 16, minor: 0, patch: 8 };
      const adapter = await Effect.runPromise(getAdapterEffect(version));

      expect(adapter.name).toBe('REDCap 16.x');
      expect(adapter.minVersion).toEqual({ major: 16, minor: 0, patch: 0 });
    });

    it('should return v16 adapter for future versions (16+)', async () => {
      const version: Version = { major: 17, minor: 0, patch: 0 };
      const adapter = await Effect.runPromise(getAdapterEffect(version));

      // v16 adapter has no maxVersion, so it catches future versions
      expect(adapter.name).toBe('REDCap 16.x');
    });

    it('should fail for unsupported version (13.x)', async () => {
      const version: Version = { major: 13, minor: 0, patch: 0 };
      const result = await Effect.runPromiseExit(getAdapterEffect(version));

      expect(result._tag).toBe('Failure');
    });

    it('should fail for version 0.x', async () => {
      const version: Version = { major: 0, minor: 0, patch: 0 };
      const result = await Effect.runPromiseExit(getAdapterEffect(version));

      expect(result._tag).toBe('Failure');
    });
  });

  describe('getAdapter', () => {
    it('should return adapter for supported version', () => {
      const version: Version = { major: 14, minor: 5, patch: 10 };
      const adapter = getAdapter(version);

      expect(adapter).toBeDefined();
      expect(adapter?.name).toBe('REDCap 14.x');
    });

    it('should return undefined for unsupported version', () => {
      const version: Version = { major: 13, minor: 0, patch: 0 };
      const adapter = getAdapter(version);

      expect(adapter).toBeUndefined();
    });
  });

  describe('getSupportedVersionRanges', () => {
    it('should return array of version range descriptions', () => {
      const ranges = getSupportedVersionRanges();

      expect(Array.isArray(ranges)).toBe(true);
      expect(ranges.length).toBeGreaterThan(0);
    });

    it('should include v14 range', () => {
      const ranges = getSupportedVersionRanges();

      const v14Range = ranges.find((r) => r.includes('REDCap 14.x'));
      expect(v14Range).toBeDefined();
      expect(v14Range).toContain('14.0.0');
    });

    it('should include v15 range', () => {
      const ranges = getSupportedVersionRanges();

      const v15Range = ranges.find((r) => r.includes('REDCap 15.x'));
      expect(v15Range).toBeDefined();
      expect(v15Range).toContain('15.0.0');
    });

    it('should include v16 range with latest', () => {
      const ranges = getSupportedVersionRanges();

      const v16Range = ranges.find((r) => r.includes('REDCap 16.x'));
      expect(v16Range).toBeDefined();
      expect(v16Range).toContain('latest');
    });
  });

  describe('isVersionSupported', () => {
    it('should return true for v14', () => {
      expect(isVersionSupported({ major: 14, minor: 0, patch: 0 })).toBe(true);
      expect(isVersionSupported({ major: 14, minor: 5, patch: 10 })).toBe(true);
      expect(isVersionSupported({ major: 14, minor: 99, patch: 99 })).toBe(true);
    });

    it('should return true for v15', () => {
      expect(isVersionSupported({ major: 15, minor: 0, patch: 0 })).toBe(true);
      expect(isVersionSupported({ major: 15, minor: 5, patch: 32 })).toBe(true);
    });

    it('should return true for v16 and above', () => {
      expect(isVersionSupported({ major: 16, minor: 0, patch: 0 })).toBe(true);
      expect(isVersionSupported({ major: 16, minor: 0, patch: 8 })).toBe(true);
      expect(isVersionSupported({ major: 17, minor: 0, patch: 0 })).toBe(true);
    });

    it('should return false for v13 and below', () => {
      expect(isVersionSupported({ major: 13, minor: 0, patch: 0 })).toBe(false);
      expect(isVersionSupported({ major: 12, minor: 0, patch: 0 })).toBe(false);
      expect(isVersionSupported({ major: 0, minor: 0, patch: 0 })).toBe(false);
    });
  });

  describe('getMinSupportedVersion', () => {
    it('should return v14.0.0 as minimum', () => {
      const minVersion = getMinSupportedVersion();

      expect(Option.isSome(minVersion)).toBe(true);
      if (Option.isSome(minVersion)) {
        expect(minVersion.value).toEqual({ major: 14, minor: 0, patch: 0 });
      }
    });
  });

  describe('getLatestAdapter', () => {
    it('should return v16 adapter', () => {
      const latest = getLatestAdapter();

      expect(Option.isSome(latest)).toBe(true);
      if (Option.isSome(latest)) {
        expect(latest.value.name).toBe('REDCap 16.x');
        expect(latest.value.maxVersion).toBeUndefined();
      }
    });
  });

  describe('v14Adapter', () => {
    it('should have correct name and version range', () => {
      expect(v14Adapter.name).toBe('REDCap 14.x');
      expect(v14Adapter.minVersion).toEqual({ major: 14, minor: 0, patch: 0 });
      expect(v14Adapter.maxVersion).toEqual({ major: 15, minor: 0, patch: 0 });
    });

    it('should have all core endpoints available', () => {
      expect(v14Adapter.isEndpointAvailable('record')).toBe(true);
      expect(v14Adapter.isEndpointAvailable('metadata')).toBe(true);
      expect(v14Adapter.isEndpointAvailable('project')).toBe(true);
      expect(v14Adapter.isEndpointAvailable('version')).toBe(true);
      expect(v14Adapter.isEndpointAvailable('instrument')).toBe(true);
    });

    it('should not have v15+ endpoints', () => {
      expect(v14Adapter.isEndpointAvailable('project_settings')).toBe(false);
      expect(v14Adapter.isEndpointAvailable('fieldValidation')).toBe(false);
    });

    it('should have standard features', () => {
      const features = v14Adapter.getFeatures();

      expect(features.repeatingInstruments).toBe(true);
      expect(features.dataAccessGroups).toBe(true);
      expect(features.fileRepository).toBe(true);
    });

    it('should pass through export params unchanged', () => {
      const params: TransformedParams = { content: 'record', format: 'json' };
      const transformed = v14Adapter.transformExportParams(params);

      expect(transformed).toEqual(params);
    });

    it('should pass through import params unchanged', () => {
      const params: TransformedParams = { content: 'record', data: '[]' };
      const transformed = v14Adapter.transformImportParams(params);

      expect(transformed).toEqual(params);
    });
  });

  describe('v15Adapter', () => {
    it('should have correct name and version range', () => {
      expect(v15Adapter.name).toBe('REDCap 15.x');
      expect(v15Adapter.minVersion).toEqual({ major: 15, minor: 0, patch: 0 });
      expect(v15Adapter.maxVersion).toEqual({ major: 16, minor: 0, patch: 0 });
    });

    it('should have v15 specific endpoints', () => {
      expect(v15Adapter.isEndpointAvailable('project_settings')).toBe(true);
      expect(v15Adapter.isEndpointAvailable('fieldValidation')).toBe(true);
    });

    it('should have all v14 endpoints', () => {
      expect(v15Adapter.isEndpointAvailable('record')).toBe(true);
      expect(v15Adapter.isEndpointAvailable('metadata')).toBe(true);
      expect(v15Adapter.isEndpointAvailable('project')).toBe(true);
    });

    it('should not have v16 specific endpoints', () => {
      expect(v15Adapter.isEndpointAvailable('filesize')).toBe(false);
      expect(v15Adapter.isEndpointAvailable('fileinfo')).toBe(false);
      expect(v15Adapter.isEndpointAvailable('project_xml')).toBe(false);
    });
  });

  describe('v16Adapter', () => {
    it('should have correct name and no max version', () => {
      expect(v16Adapter.name).toBe('REDCap 16.x');
      expect(v16Adapter.minVersion).toEqual({ major: 16, minor: 0, patch: 0 });
      expect(v16Adapter.maxVersion).toBeUndefined();
    });

    it('should have v16 specific endpoints', () => {
      expect(v16Adapter.isEndpointAvailable('filesize')).toBe(true);
      expect(v16Adapter.isEndpointAvailable('fileinfo')).toBe(true);
      expect(v16Adapter.isEndpointAvailable('project_xml')).toBe(true);
    });

    it('should have all previous endpoints', () => {
      expect(v16Adapter.isEndpointAvailable('record')).toBe(true);
      expect(v16Adapter.isEndpointAvailable('project_settings')).toBe(true);
      expect(v16Adapter.isEndpointAvailable('fieldValidation')).toBe(true);
    });
  });

  describe('createBaseAdapter', () => {
    it('should create adapter with default behavior', () => {
      const adapter = createBaseAdapter({
        name: 'Test Adapter',
        minVersion: { major: 10, minor: 0, patch: 0 },
        maxVersion: { major: 11, minor: 0, patch: 0 },
      });

      expect(adapter.name).toBe('Test Adapter');
      expect(adapter.minVersion).toEqual({ major: 10, minor: 0, patch: 0 });
      expect(adapter.maxVersion).toEqual({ major: 11, minor: 0, patch: 0 });
    });

    it('should have passthrough transform functions', () => {
      const adapter = createBaseAdapter({
        name: 'Test',
        minVersion: { major: 10, minor: 0, patch: 0 },
      });

      const params = { foo: 'bar', baz: 'qux' };
      expect(adapter.transformExportParams(params)).toEqual(params);
      expect(adapter.transformImportParams(params)).toEqual(params);
    });

    it('should return true for all endpoints by default', () => {
      const adapter = createBaseAdapter({
        name: 'Test',
        minVersion: { major: 10, minor: 0, patch: 0 },
      });

      expect(adapter.isEndpointAvailable('anything')).toBe(true);
      expect(adapter.isEndpointAvailable('unknown')).toBe(true);
    });

    it('should return empty default params', () => {
      const adapter = createBaseAdapter({
        name: 'Test',
        minVersion: { major: 10, minor: 0, patch: 0 },
      });

      expect(adapter.getDefaultParams()).toEqual({});
    });

    it('should return default features', () => {
      const adapter = createBaseAdapter({
        name: 'Test',
        minVersion: { major: 10, minor: 0, patch: 0 },
      });

      const features = adapter.getFeatures();
      expect(features.repeatingInstruments).toBe(true);
      expect(features.dataAccessGroups).toBe(true);
    });

    it('should parse project info from object', () => {
      const adapter = createBaseAdapter({
        name: 'Test',
        minVersion: { major: 10, minor: 0, patch: 0 },
      });

      const response = { project_id: 1, project_title: 'Test Project' };
      const result = adapter.parseProjectInfo(response);

      expect(result).toEqual(response);
    });

    it('should return empty object for null response', () => {
      const adapter = createBaseAdapter({
        name: 'Test',
        minVersion: { major: 10, minor: 0, patch: 0 },
      });

      const result = adapter.parseProjectInfo(null);
      expect(result).toEqual({});
    });
  });

  describe('extendAdapter', () => {
    it('should override specific methods', () => {
      const base = createBaseAdapter({
        name: 'Base',
        minVersion: { major: 10, minor: 0, patch: 0 },
      });

      const extended = extendAdapter(base, {
        name: 'Extended',
        isEndpointAvailable: (content) => content === 'special',
      });

      expect(extended.name).toBe('Extended');
      expect(extended.isEndpointAvailable('special')).toBe(true);
      expect(extended.isEndpointAvailable('other')).toBe(false);
      // Should keep base methods
      expect(extended.transformExportParams({ a: 'b' })).toEqual({ a: 'b' });
    });

    it('should allow overriding features', () => {
      const base = createBaseAdapter({
        name: 'Base',
        minVersion: { major: 10, minor: 0, patch: 0 },
      });

      const customFeatures: RedcapFeatures = {
        repeatingInstruments: false,
        dataAccessGroups: false,
        fileRepository: false,
        mycap: false,
        surveyQueue: false,
        alerts: false,
      };

      const extended = extendAdapter(base, {
        getFeatures: () => customFeatures,
      });

      expect(extended.getFeatures()).toEqual(customFeatures);
    });

    it('should allow overriding transforms', () => {
      const base = createBaseAdapter({
        name: 'Base',
        minVersion: { major: 10, minor: 0, patch: 0 },
      });

      const extended = extendAdapter(base, {
        transformExportParams: (params) => ({ ...params, extra: 'value' }),
      });

      expect(extended.transformExportParams({ content: 'record' })).toEqual({
        content: 'record',
        extra: 'value',
      });
    });
  });
});
