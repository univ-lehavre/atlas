import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock function at module level for hoisting
const mockGetById = vi.fn();

// Mock the AppwriteUserRepository as a class
vi.mock('$lib/appwrite/server/userRepository', () => {
  return {
    AppwriteUserRepository: class MockAppwriteUserRepository {
      getById(userId: string) {
        return mockGetById(userId);
      }
    },
  };
});

import { getProfile } from './profileService';

describe('profileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should call userRepository.getById with userId', async () => {
      mockGetById.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        labels: ['admin'],
      });

      const result = await getProfile('user-123');

      expect(mockGetById).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({ id: 'user-123', email: 'test@example.com', labels: ['admin'] });
    });

    it('should return user profile when user exists', async () => {
      const expectedProfile = { id: 'user-456', email: 'another@example.com', labels: [] };

      mockGetById.mockResolvedValue(expectedProfile);

      const result = await getProfile('user-456');

      expect(result).toEqual(expectedProfile);
    });

    it('should handle errors from repository', async () => {
      mockGetById.mockRejectedValue(new Error('User not found'));

      await expect(getProfile('unknown')).rejects.toThrow('User not found');
    });
  });
});
