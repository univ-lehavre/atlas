/**
 * @fileoverview Tests for constants.
 */

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_INTERNET_CHECK_TIMEOUT_MS,
  DEFAULT_TCP_TIMEOUT_MS,
  DEFAULT_TLS_TIMEOUT_MS,
  HTTPS_PORT,
  INTERNET_CHECK_HOST,
} from './constants.js';

describe('constants', () => {
  describe('Timeouts', () => {
    it('should export DEFAULT_TCP_TIMEOUT_MS as 3000', () => {
      expect(DEFAULT_TCP_TIMEOUT_MS).toBe(3000);
    });

    it('should export DEFAULT_TLS_TIMEOUT_MS as 5000', () => {
      expect(DEFAULT_TLS_TIMEOUT_MS).toBe(5000);
    });

    it('should export DEFAULT_INTERNET_CHECK_TIMEOUT_MS as 5000', () => {
      expect(DEFAULT_INTERNET_CHECK_TIMEOUT_MS).toBe(5000);
    });
  });

  describe('Network', () => {
    it('should export INTERNET_CHECK_HOST as Cloudflare DNS', () => {
      expect(INTERNET_CHECK_HOST).toBe('1.1.1.1');
    });

    it('should export HTTPS_PORT as 443', () => {
      expect(HTTPS_PORT).toBe(443);
    });
  });
});
