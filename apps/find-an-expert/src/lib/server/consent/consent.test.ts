import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  eventRepo: { create: vi.fn(), getByUserId: vi.fn() },
  currentRepo: { get: vi.fn(), upsert: vi.fn() },
}));

vi.mock('./repository', () => ({
  AppwriteConsentEventRepository: vi.fn(function () {
    return mocks.eventRepo;
  }),
  AppwriteCurrentConsentRepository: vi.fn(function () {
    return mocks.currentRepo;
  }),
}));

import { getConsentStatus, grantConsent, revokeConsent, getAllConsents } from './service';

describe('consent service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConsentStatus', () => {
    it('should return null status when no consent exists', async () => {
      mocks.currentRepo.get.mockResolvedValue(null);

      const result = await getConsentStatus('user1', 'openalex_email');

      expect(result).toEqual({ consentType: 'openalex_email', granted: null, updatedAt: null });
    });

    it('should return granted status from existing consent', async () => {
      mocks.currentRepo.get.mockResolvedValue({
        userId: 'user1',
        consentType: 'openalex_email',
        granted: true,
        $updatedAt: '2024-01-01T00:00:00.000+00:00',
      });

      const result = await getConsentStatus('user1', 'openalex_email');

      expect(result.granted).toBe(true);
      expect(result.updatedAt).toBe('2024-01-01T00:00:00.000+00:00');
    });

    it('should return revoked status from existing consent', async () => {
      mocks.currentRepo.get.mockResolvedValue({
        userId: 'user1',
        consentType: 'openalex_email',
        granted: false,
        $updatedAt: '2024-01-01T00:00:00.000+00:00',
      });

      const result = await getConsentStatus('user1', 'openalex_email');

      expect(result.granted).toBe(false);
    });
  });

  describe('grantConsent', () => {
    it('should create audit event and return granted status', async () => {
      mocks.eventRepo.create.mockResolvedValue({});
      mocks.currentRepo.upsert.mockResolvedValue({
        userId: 'user1',
        consentType: 'openalex_email',
        granted: true,
        $updatedAt: '2024-06-01T00:00:00.000+00:00',
      });

      const result = await grantConsent('user1', 'openalex_email');

      expect(mocks.eventRepo.create).toHaveBeenCalledWith({
        userId: 'user1',
        consentType: 'openalex_email',
        action: 'grant',
      });
      expect(mocks.currentRepo.upsert).toHaveBeenCalledWith('user1', 'openalex_email', true);
      expect(result.granted).toBe(true);
    });
  });

  describe('revokeConsent', () => {
    it('should create audit event and return revoked status', async () => {
      mocks.eventRepo.create.mockResolvedValue({});
      mocks.currentRepo.upsert.mockResolvedValue({
        userId: 'user1',
        consentType: 'openalex_email',
        granted: false,
        $updatedAt: '2024-06-01T00:00:00.000+00:00',
      });

      const result = await revokeConsent('user1', 'openalex_email');

      expect(mocks.eventRepo.create).toHaveBeenCalledWith({
        userId: 'user1',
        consentType: 'openalex_email',
        action: 'revoke',
      });
      expect(mocks.currentRepo.upsert).toHaveBeenCalledWith('user1', 'openalex_email', false);
      expect(result.granted).toBe(false);
    });
  });

  describe('getAllConsents', () => {
    it('should return empty map when user has no consents', async () => {
      mocks.currentRepo.get.mockResolvedValue(null);

      const result = await getAllConsents('user1');

      expect(result.size).toBe(0);
    });

    it('should return map with existing consent', async () => {
      const consent = {
        userId: 'user1',
        consentType: 'openalex_email' as const,
        granted: true,
        $updatedAt: '2024-01-01T00:00:00.000+00:00',
      };
      mocks.currentRepo.get.mockResolvedValue(consent);

      const result = await getAllConsents('user1');

      expect(result.size).toBe(1);
      expect(result.get('openalex_email')).toEqual(consent);
    });
  });
});
