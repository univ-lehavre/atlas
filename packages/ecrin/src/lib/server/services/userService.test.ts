import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Fetch } from '$lib/types';

// Mock dependencies before importing the module
vi.mock('$lib/redcap/server', () => ({ fetchRedcap: vi.fn() }));

vi.mock('../../transformers/build-name', () => ({
  transformToName: vi.fn((first, middle, last) =>
    `${first} ${middle} ${last}`.trim().replace(/\s+/g, ' ')
  ),
}));

import { fetchRedcap } from '$lib/redcap/server';
import { transformToName } from '../../transformers/build-name';
import { listUsersFromRedcap, fetchUserId, mapAppwriteUserToProfile } from './userService';

const mockFetchRedcap = vi.mocked(fetchRedcap);
const mockTransformToName = vi.mocked(transformToName);

describe('userService', () => {
  const mockFetch: Fetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listUsersFromRedcap', () => {
    it('should return list of users with transformed names', async () => {
      mockFetchRedcap.mockResolvedValue([
        { id: 'user-1', first_name: 'John', middle_name: '', last_name: 'Doe' },
        { id: 'user-2', first_name: 'Jane', middle_name: 'Marie', last_name: 'Smith' },
      ]);
      mockTransformToName.mockImplementation((first, middle, last) =>
        [first, middle, last].filter(Boolean).join(' ')
      );

      const result = await listUsersFromRedcap(mockFetch);

      expect(result).toEqual([
        { id: 'user-1', name: 'John Doe' },
        { id: 'user-2', name: 'Jane Marie Smith' },
      ]);
    });

    it('should call fetchRedcap with correct parameters', async () => {
      mockFetchRedcap.mockResolvedValue([]);

      await listUsersFromRedcap(mockFetch);

      expect(mockFetchRedcap).toHaveBeenCalledWith(
        mockFetch,
        expect.objectContaining({
          token: 'test-token',
          content: 'record',
          action: 'export',
          format: 'json',
          type: 'flat',
          'fields[0]': 'last_name',
          'fields[1]': 'first_name',
          'fields[2]': 'middle_name',
          'fields[3]': 'id',
        })
      );
    });

    it('should return empty array when no users found', async () => {
      mockFetchRedcap.mockResolvedValue([]);

      const result = await listUsersFromRedcap(mockFetch);

      expect(result).toEqual([]);
    });
  });

  describe('fetchUserId', () => {
    it('should return user ID when exactly one user matches email', async () => {
      mockFetchRedcap.mockResolvedValue([{ id: 'user-123' }]);

      const result = await fetchUserId(mockFetch, 'test@example.com');

      expect(result).toBe('user-123');
    });

    it('should return null when no user matches email', async () => {
      mockFetchRedcap.mockResolvedValue([]);

      const result = await fetchUserId(mockFetch, 'unknown@example.com');

      expect(result).toBeNull();
    });

    it('should return null when multiple users match email', async () => {
      mockFetchRedcap.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);

      const result = await fetchUserId(mockFetch, 'duplicate@example.com');

      expect(result).toBeNull();
    });

    it('should call fetchRedcap with filterLogic containing email', async () => {
      mockFetchRedcap.mockResolvedValue([]);

      await fetchUserId(mockFetch, 'test@example.com');

      expect(mockFetchRedcap).toHaveBeenCalledWith(
        mockFetch,
        expect.objectContaining({ filterLogic: '[mail] = "test@example.com"' })
      );
    });
  });

  describe('mapAppwriteUserToProfile', () => {
    it('should map Appwrite user to profile', () => {
      const user = { $id: 'user-123', email: 'test@example.com', labels: ['admin', 'researcher'] };

      const result = mapAppwriteUserToProfile(user);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        labels: ['admin', 'researcher'],
      });
    });

    it('should return null values when user is null', () => {
      const result = mapAppwriteUserToProfile(null);

      expect(result).toEqual({ id: null, email: null, name: null });
    });

    it('should use fallbackId when user is null', () => {
      const result = mapAppwriteUserToProfile(null, 'fallback-id');

      expect(result).toEqual({ id: 'fallback-id', email: null, name: null });
    });

    it('should use fallbackId when user.$id is missing', () => {
      const user = { email: 'test@example.com', labels: [] };

      const result = mapAppwriteUserToProfile(user, 'fallback-id');

      expect(result).toEqual({ id: 'fallback-id', email: 'test@example.com', labels: [] });
    });

    it('should handle missing labels', () => {
      const user = { $id: 'user-123', email: 'test@example.com' };

      const result = mapAppwriteUserToProfile(user);

      expect('labels' in result ? result.labels : []).toEqual([]);
    });

    it('should handle missing email', () => {
      const user = { $id: 'user-123', labels: ['admin'] };

      const result = mapAppwriteUserToProfile(user);

      expect(result.email).toBeNull();
    });
  });
});
