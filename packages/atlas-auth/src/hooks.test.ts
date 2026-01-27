import { describe, it, expect } from 'vitest';
import { isExpectedAuthError, isNetworkError } from './hooks.js';
import { SessionError } from '@univ-lehavre/atlas-errors';
import { AppwriteException } from 'node-appwrite';

describe('isExpectedAuthError', () => {
  it('should return true for SessionError', () => {
    const error = new SessionError('No session');
    expect(isExpectedAuthError(error)).toBe(true);
  });

  it('should return true for AppwriteException with code 401', () => {
    const error = new AppwriteException('Unauthorized', 401);
    expect(isExpectedAuthError(error)).toBe(true);
  });

  it('should return false for AppwriteException with other codes', () => {
    const error = new AppwriteException('Server error', 500);
    expect(isExpectedAuthError(error)).toBe(false);
  });

  it('should return false for regular Error', () => {
    const error = new Error('Something broke');
    expect(isExpectedAuthError(error)).toBe(false);
  });

  it('should return false for non-error values', () => {
    expect(isExpectedAuthError('string')).toBe(false);
    expect(isExpectedAuthError(null)).toBe(false);
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(isExpectedAuthError(undefined)).toBe(false);
  });
});

describe('isNetworkError', () => {
  it('should return true for "fetch failed" message', () => {
    const error = new Error('fetch failed');
    expect(isNetworkError(error)).toBe(true);
  });

  it('should return true for ETIMEDOUT', () => {
    const error = new Error('Connection timed out');
    (error as Error & { cause: { code: string } }).cause = { code: 'ETIMEDOUT' };
    expect(isNetworkError(error)).toBe(true);
  });

  it('should return true for ECONNREFUSED', () => {
    const error = new Error('Connection refused');
    (error as Error & { cause: { code: string } }).cause = { code: 'ECONNREFUSED' };
    expect(isNetworkError(error)).toBe(true);
  });

  it('should return true for ENOTFOUND', () => {
    const error = new Error('DNS not found');
    (error as Error & { cause: { code: string } }).cause = { code: 'ENOTFOUND' };
    expect(isNetworkError(error)).toBe(true);
  });

  it('should return true for ENETUNREACH', () => {
    const error = new Error('Network unreachable');
    (error as Error & { cause: { code: string } }).cause = { code: 'ENETUNREACH' };
    expect(isNetworkError(error)).toBe(true);
  });

  it('should return false for other errors', () => {
    const error = new Error('Something else');
    expect(isNetworkError(error)).toBe(false);
  });

  it('should return false for non-error values', () => {
    expect(isNetworkError('string')).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});
