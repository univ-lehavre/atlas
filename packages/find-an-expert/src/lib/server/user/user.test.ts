import { describe, it, expect } from 'vitest';
import { User, type TUser, type UserRepository } from './types';
import { isAdmin } from './service';

describe('User schema', () => {
  it('should validate a complete user object', () => {
    const userData = {
      id: 'abc123',
      email: 'test@example.com',
      labels: ['admin', 'verified'],
    };

    const result = User.safeParse(userData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(userData);
    }
  });

  it('should validate user with null email', () => {
    const userData = {
      id: 'abc123',
      email: null,
      labels: [],
    };

    const result = User.safeParse(userData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeNull();
    }
  });

  it('should validate user with empty labels', () => {
    const userData = {
      id: 'abc123',
      email: 'test@example.com',
      labels: [],
    };

    const result = User.safeParse(userData);

    expect(result.success).toBe(true);
  });

  it('should reject user without id', () => {
    const userData = {
      email: 'test@example.com',
      labels: [],
    };

    const result = User.safeParse(userData);

    expect(result.success).toBe(false);
  });

  it('should reject user without labels', () => {
    const userData = {
      id: 'abc123',
      email: 'test@example.com',
    };

    const result = User.safeParse(userData);

    expect(result.success).toBe(false);
  });

  it('should reject user with invalid email format', () => {
    const userData = {
      id: 'abc123',
      email: 'not-an-email',
      labels: [],
    };

    const result = User.safeParse(userData);

    expect(result.success).toBe(false);
  });

  it('should reject user with non-string labels', () => {
    const userData = {
      id: 'abc123',
      email: 'test@example.com',
      labels: [123, 456],
    };

    const result = User.safeParse(userData);

    expect(result.success).toBe(false);
  });

  it('should reject extra properties (strict mode)', () => {
    const userData = {
      id: 'abc123',
      email: 'test@example.com',
      labels: [],
      extraField: 'should not be here',
    };

    const result = User.safeParse(userData);

    expect(result.success).toBe(false);
  });
});

describe('UserRepository interface', () => {
  it('should be implementable', async () => {
    const mockRepository: UserRepository = {
      getById: async (userId: string): Promise<TUser> => ({
        id: userId,
        email: 'mock@example.com',
        labels: ['mock'],
      }),
    };

    const user = await mockRepository.getById('test123');

    expect(user.id).toBe('test123');
    expect(user.email).toBe('mock@example.com');
    expect(user.labels).toEqual(['mock']);
  });
});

describe('isAdmin', () => {
  it('should return true for user with admin label', () => {
    const user: TUser = {
      id: 'user123',
      email: 'admin@example.com',
      labels: ['admin'],
    };

    expect(isAdmin(user)).toBe(true);
  });

  it('should return true for user with admin among other labels', () => {
    const user: TUser = {
      id: 'user123',
      email: 'admin@example.com',
      labels: ['verified', 'admin', 'premium'],
    };

    expect(isAdmin(user)).toBe(true);
  });

  it('should return false for user without admin label', () => {
    const user: TUser = {
      id: 'user123',
      email: 'user@example.com',
      labels: ['verified'],
    };

    expect(isAdmin(user)).toBe(false);
  });

  it('should return false for user with empty labels', () => {
    const user: TUser = {
      id: 'user123',
      email: 'user@example.com',
      labels: [],
    };

    expect(isAdmin(user)).toBe(false);
  });

  it('should return false for null user', () => {
    expect(isAdmin(null)).toBe(false);
  });
});
