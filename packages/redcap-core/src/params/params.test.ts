/**
 * @module params/params.test
 * @description Tests for API parameter builders and escape utilities
 */

import { describe, it, expect } from 'vitest';
import {
  buildExportParams,
  buildImportParams,
  buildMetadataExportParams,
  buildProjectInfoParams,
  buildUserExportParams,
  buildInstrumentExportParams,
  buildVersionParams,
  cleanParams,
} from './builders.js';
import { escapeFilterLogicValue, escapeLikePattern, quoteFilterValue } from './escape.js';

describe('buildExportParams', () => {
  it('should build default params', () => {
    const params = buildExportParams();
    expect(params.content).toBe('record');
    expect(params.format).toBe('json');
    expect(params.type).toBe('flat');
    expect(params.rawOrLabel).toBe('raw');
    expect(params.rawOrLabelHeaders).toBe('raw');
    expect(params.returnFormat).toBe('json');
  });

  it('should add fields with indexed keys', () => {
    const params = buildExportParams({ fields: ['record_id', 'name', 'age'] });
    expect(params['fields[0]']).toBe('record_id');
    expect(params['fields[1]']).toBe('name');
    expect(params['fields[2]']).toBe('age');
  });

  it('should add records with indexed keys', () => {
    const params = buildExportParams({ records: ['1', '2', '3'] });
    expect(params['records[0]']).toBe('1');
    expect(params['records[1]']).toBe('2');
    expect(params['records[2]']).toBe('3');
  });

  it('should add forms with indexed keys', () => {
    const params = buildExportParams({ forms: ['demographics', 'vitals'] });
    expect(params['forms[0]']).toBe('demographics');
    expect(params['forms[1]']).toBe('vitals');
  });

  it('should add events with indexed keys', () => {
    const params = buildExportParams({ events: ['event_1_arm_1', 'event_2_arm_1'] });
    expect(params['events[0]']).toBe('event_1_arm_1');
    expect(params['events[1]']).toBe('event_2_arm_1');
  });

  it('should add filterLogic', () => {
    const params = buildExportParams({ filterLogic: '[age] > 18' });
    expect(params.filterLogic).toBe('[age] > 18');
  });

  it('should add date range', () => {
    const params = buildExportParams({
      dateRangeBegin: '2024-01-01',
      dateRangeEnd: '2024-12-31',
    });
    expect(params.dateRangeBegin).toBe('2024-01-01');
    expect(params.dateRangeEnd).toBe('2024-12-31');
  });

  it('should set boolean flags', () => {
    const params = buildExportParams({
      exportCheckboxLabel: true,
      exportSurveyFields: true,
      exportDataAccessGroups: true,
    });
    expect(params.exportCheckboxLabel).toBe('true');
    expect(params.exportSurveyFields).toBe('true');
    expect(params.exportDataAccessGroups).toBe('true');
  });

  it('should not set false boolean flags', () => {
    const params = buildExportParams({
      exportCheckboxLabel: false,
      exportSurveyFields: false,
    });
    expect(params.exportCheckboxLabel).toBeUndefined();
    expect(params.exportSurveyFields).toBeUndefined();
  });

  it('should set type', () => {
    expect(buildExportParams({ type: 'eav' }).type).toBe('eav');
    expect(buildExportParams({ type: 'flat' }).type).toBe('flat');
  });

  it('should set rawOrLabel', () => {
    expect(buildExportParams({ rawOrLabel: 'label' }).rawOrLabel).toBe('label');
  });
});

describe('buildImportParams', () => {
  it('should build import params with records', () => {
    const records = [{ record_id: '1', name: 'Test' }];
    const params = buildImportParams(records);

    expect(params.content).toBe('record');
    expect(params.format).toBe('json');
    expect(params.data).toBe(JSON.stringify(records));
    expect(params.type).toBe('flat');
    expect(params.overwriteBehavior).toBe('normal');
    expect(params.returnContent).toBe('count');
    expect(params.dateFormat).toBe('YMD');
  });

  it('should set options', () => {
    const records = [{ record_id: '1' }];
    const params = buildImportParams(records, {
      type: 'eav',
      overwriteBehavior: 'overwrite',
      forceAutoNumber: true,
      returnContent: 'ids',
      dateFormat: 'DMY',
    });

    expect(params.type).toBe('eav');
    expect(params.overwriteBehavior).toBe('overwrite');
    expect(params.forceAutoNumber).toBe('true');
    expect(params.returnContent).toBe('ids');
    expect(params.dateFormat).toBe('DMY');
  });

  it('should handle empty records', () => {
    const params = buildImportParams([]);
    expect(params.data).toBe('[]');
  });

  it('should serialize nested data', () => {
    const records = [{ record_id: '1', data: { nested: true } }];
    const params = buildImportParams(records);
    expect(params.data).toBe('[{"record_id":"1","data":{"nested":true}}]');
  });
});

describe('buildMetadataExportParams', () => {
  it('should build default params', () => {
    const params = buildMetadataExportParams();
    expect(params.content).toBe('metadata');
    expect(params.format).toBe('json');
  });

  it('should add forms with indexed keys', () => {
    const params = buildMetadataExportParams({ forms: ['demographics', 'vitals'] });
    expect(params['forms[0]']).toBe('demographics');
    expect(params['forms[1]']).toBe('vitals');
  });

  it('should add fields with indexed keys', () => {
    const params = buildMetadataExportParams({ fields: ['record_id', 'age'] });
    expect(params['fields[0]']).toBe('record_id');
    expect(params['fields[1]']).toBe('age');
  });
});

describe('buildProjectInfoParams', () => {
  it('should build project info params', () => {
    const params = buildProjectInfoParams();
    expect(params.content).toBe('project');
    expect(params.format).toBe('json');
    expect(params.returnFormat).toBe('json');
  });
});

describe('buildUserExportParams', () => {
  it('should build user export params', () => {
    const params = buildUserExportParams();
    expect(params.content).toBe('user');
    expect(params.format).toBe('json');
  });
});

describe('buildInstrumentExportParams', () => {
  it('should build instrument export params', () => {
    const params = buildInstrumentExportParams();
    expect(params.content).toBe('instrument');
    expect(params.format).toBe('json');
  });
});

describe('buildVersionParams', () => {
  it('should build version params', () => {
    const params = buildVersionParams();
    expect(params.content).toBe('version');
    expect(Object.keys(params)).toHaveLength(1);
  });
});

describe('cleanParams', () => {
  it('should remove undefined values', () => {
    const params = {
      a: 'value',
      b: undefined,
      c: 'another',
      d: undefined,
    };
    const cleaned = cleanParams(params);
    expect(cleaned).toEqual({ a: 'value', c: 'another' });
    expect('b' in cleaned).toBe(false);
    expect('d' in cleaned).toBe(false);
  });

  it('should keep empty string values', () => {
    const params = { a: '', b: undefined };
    const cleaned = cleanParams(params);
    expect(cleaned).toEqual({ a: '' });
  });

  it('should handle all undefined', () => {
    const params = { a: undefined, b: undefined };
    const cleaned = cleanParams(params);
    expect(cleaned).toEqual({});
  });

  it('should handle empty object', () => {
    const cleaned = cleanParams({});
    expect(cleaned).toEqual({});
  });
});

describe('escapeFilterLogicValue', () => {
  it('should escape single quotes', () => {
    expect(escapeFilterLogicValue("O'Brien")).toBe("O\\'Brien");
  });

  it('should escape double quotes', () => {
    expect(escapeFilterLogicValue('He said "hello"')).toBe('He said \\"hello\\"');
  });

  it('should escape backslashes', () => {
    expect(escapeFilterLogicValue('path\\to\\file')).toBe('path\\\\to\\\\file');
  });

  it('should escape multiple special characters', () => {
    expect(escapeFilterLogicValue('It\'s a "test\\path"')).toBe('It\\\'s a \\"test\\\\path\\"');
  });

  it('should handle empty string', () => {
    expect(escapeFilterLogicValue('')).toBe('');
  });

  it('should handle string without special characters', () => {
    expect(escapeFilterLogicValue('normal text')).toBe('normal text');
  });
});

describe('escapeLikePattern', () => {
  it('should escape percent sign', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%');
  });

  it('should escape underscore', () => {
    expect(escapeLikePattern('field_name')).toBe('field\\_name');
  });

  it('should escape backslash', () => {
    expect(escapeLikePattern('path\\file')).toBe('path\\\\file');
  });

  it('should escape multiple special characters', () => {
    expect(escapeLikePattern('50% of_data\\path')).toBe('50\\% of\\_data\\\\path');
  });

  it('should handle empty string', () => {
    expect(escapeLikePattern('')).toBe('');
  });
});

describe('quoteFilterValue', () => {
  it('should quote simple value', () => {
    expect(quoteFilterValue('test')).toBe("'test'");
  });

  it('should quote and escape value with quotes', () => {
    expect(quoteFilterValue("O'Brien")).toBe("'O\\'Brien'");
  });

  it('should quote empty string', () => {
    expect(quoteFilterValue('')).toBe("''");
  });
});
