import { describe, it, expect, vi, beforeEach } from 'vitest';
import { users } from './users.js';
import * as redcapModule from '../redcap.js';
import { Effect } from 'effect';
import { RedcapNetworkError, RedcapApiError } from '@univ-lehavre/atlas-redcap-api';

// Mock the redcap module
vi.mock('../redcap.js', () => ({
  redcap: {
    findUserIdByEmail: vi.fn(),
  },
}));

describe('Users Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /users/by-email', () => {
    it('finds user by email successfully', async () => {
      vi.spyOn(redcapModule.redcap, 'findUserIdByEmail').mockReturnValue(Effect.succeed('user123'));

      const res = await users.request('/by-email?email=john.doe@example.com');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({ data: { userId: 'user123' } });
      expect(redcapModule.redcap.findUserIdByEmail).toHaveBeenCalledWith('john.doe@example.com');
    });

    it('returns 404 when user not found (null)', async () => {
      vi.spyOn(redcapModule.redcap, 'findUserIdByEmail').mockReturnValue(Effect.succeed(null));

      const res = await users.request('/by-email?email=notfound@example.com');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json).toEqual({
        data: null,
        error: {
          code: 'redcap_api_error',
          message: 'User not found',
        },
      });
    });

    it('returns 404 when user not found (empty string)', async () => {
      vi.spyOn(redcapModule.redcap, 'findUserIdByEmail').mockReturnValue(Effect.succeed(''));

      const res = await users.request('/by-email?email=notfound@example.com');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json).toEqual({
        data: null,
        error: {
          code: 'redcap_api_error',
          message: 'User not found',
        },
      });
    });

    it('accepts various valid email formats', async () => {
      const validEmails = [
        'simple@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_name@sub.example.com',
      ];

      vi.spyOn(redcapModule.redcap, 'findUserIdByEmail').mockReturnValue(Effect.succeed('user123'));

      const results = await Promise.all(
        validEmails.map(async (email) =>
          users.request(`/by-email?email=${encodeURIComponent(email)}`)
        )
      );

      expect(results.every((res) => res.status === 200)).toBe(true);
    });

    it('rejects invalid email format (missing @)', async () => {
      const res = await users.request('/by-email?email=notanemail');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('validation_error');
    });

    it('rejects invalid email format (missing domain)', async () => {
      const res = await users.request('/by-email?email=user@');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('validation_error');
    });

    it('rejects invalid email format (missing local part)', async () => {
      const res = await users.request('/by-email?email=@example.com');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('validation_error');
    });

    it('rejects request without email parameter', async () => {
      const res = await users.request('/by-email');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('validation_error');
    });

    it('handles network errors', async () => {
      vi.spyOn(redcapModule.redcap, 'findUserIdByEmail').mockReturnValue(
        Effect.fail(new RedcapNetworkError({ cause: new Error('Connection failed') }))
      );

      const res = await users.request('/by-email?email=john.doe@example.com');
      expect(res.status).toBe(503);

      const json = await res.json();
      expect(json).toEqual({
        data: null,
        error: {
          code: 'network_error',
          message: 'Failed to connect to REDCap',
        },
      });
    });

    it('handles REDCap API errors', async () => {
      vi.spyOn(redcapModule.redcap, 'findUserIdByEmail').mockReturnValue(
        Effect.fail(new RedcapApiError({ message: 'Invalid API token' }))
      );

      const res = await users.request('/by-email?email=john.doe@example.com');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json).toEqual({
        data: null,
        error: {
          code: 'redcap_api_error',
          message: 'Invalid API token',
        },
      });
    });
  });
});
