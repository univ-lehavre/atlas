import { describe, it, expect } from 'vitest';
import { inferParamType, inferInferredFieldType } from './inference.js';

describe('inferParamType', () => {
  it('returns array for records', () => expect(inferParamType('records')).toBe('array'));
  it('returns array for fields', () => expect(inferParamType('fields')).toBe('array'));
  it('returns boolean for exportSurveyFields', () =>
    expect(inferParamType('exportSurveyFields')).toBe('boolean'));
  it('returns boolean for forceAutoNumber', () =>
    expect(inferParamType('forceAutoNumber')).toBe('boolean'));
  it('returns integer for report_id', () => expect(inferParamType('report_id')).toBe('integer'));
  it('returns integer for arm', () => expect(inferParamType('arm')).toBe('integer'));
  it('returns string for unknown', () => expect(inferParamType('token')).toBe('string'));
  it('returns string for content', () => expect(inferParamType('content')).toBe('string'));
});

describe('inferInferredFieldType', () => {
  it('returns integer for project_id', () =>
    expect(inferInferredFieldType('project_id')).toBe('integer'));
  it('returns integer for record_count', () =>
    expect(inferInferredFieldType('record_count')).toBe('integer'));
  it('returns boolean for is_longitudinal', () =>
    expect(inferInferredFieldType('is_longitudinal')).toBe('boolean'));
  it('returns boolean for surveys_enabled', () =>
    expect(inferInferredFieldType('surveys_enabled')).toBe('boolean'));
  it('returns string for project_title', () =>
    expect(inferInferredFieldType('project_title')).toBe('string'));
});
