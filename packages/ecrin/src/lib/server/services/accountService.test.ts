import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkAccountPushed, pushAccountToRedcap } from './accountService';
import type { Fetch } from '$lib/types';

// Mock fetchRedcap
vi.mock('$lib/redcap/server', () => ({ fetchRedcap: vi.fn() }));

import { fetchRedcap } from '$lib/redcap/server';

const mockFetchRedcap = vi.mocked(fetchRedcap);

describe('accountService', () => {
  const mockFetch: Fetch = vi.fn();
  const token = 'test-token';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAccountPushed', () => {
    const id = 'user-123';
    const email = 'test@example.com';

    it('should return all true when user exists with matching id, email and is active', async () => {
      mockFetchRedcap.mockResolvedValue([
        { id: 'user-123', mail: 'test@example.com', active: 'Oui' },
      ]);

      const result = await checkAccountPushed(token, id, email, mockFetch);

      expect(result).toEqual({
        hasPushedID: true,
        hasPushedEmail: true,
        hasPushedAccount: true,
        isActive: true,
      });
    });

    it('should return isActive true when active is "1"', async () => {
      mockFetchRedcap.mockResolvedValue([
        { id: 'user-123', mail: 'test@example.com', active: '1' },
      ]);

      const result = await checkAccountPushed(token, id, email, mockFetch);

      expect(result.isActive).toBe(true);
    });

    it('should return hasPushedEmail false when email does not match', async () => {
      mockFetchRedcap.mockResolvedValue([
        { id: 'user-123', mail: 'other@example.com', active: 'Oui' },
      ]);

      const result = await checkAccountPushed(token, id, email, mockFetch);

      expect(result).toEqual({
        hasPushedID: true,
        hasPushedEmail: false,
        hasPushedAccount: false,
        isActive: true,
      });
    });

    it('should return hasPushedID false when id does not match', async () => {
      mockFetchRedcap.mockResolvedValue([
        { id: 'other-id', mail: 'test@example.com', active: 'Oui' },
      ]);

      const result = await checkAccountPushed(token, id, email, mockFetch);

      expect(result).toEqual({
        hasPushedID: false,
        hasPushedEmail: true,
        hasPushedAccount: false,
        isActive: true,
      });
    });

    it('should return all false when user does not exist', async () => {
      mockFetchRedcap.mockResolvedValue([]);

      const result = await checkAccountPushed(token, id, email, mockFetch);

      expect(result).toEqual({
        hasPushedID: false,
        hasPushedEmail: false,
        hasPushedAccount: false,
        isActive: false,
      });
    });

    it('should return isActive false when active is not "Oui" or "1"', async () => {
      mockFetchRedcap.mockResolvedValue([
        { id: 'user-123', mail: 'test@example.com', active: 'Non' },
      ]);

      const result = await checkAccountPushed(token, id, email, mockFetch);

      expect(result.isActive).toBe(false);
    });

    it('should call fetchRedcap with correct parameters', async () => {
      mockFetchRedcap.mockResolvedValue([]);

      await checkAccountPushed(token, id, email, mockFetch);

      expect(mockFetchRedcap).toHaveBeenCalledWith(mockFetch, {
        token,
        'records[0]': id,
        fields: 'id,mail,active',
        content: 'record',
        action: 'export',
        format: 'json',
        type: 'flat',
        csvDelimiter: '',
        rawOrLabel: 'label',
        rawOrLabelHeaders: 'raw',
        exportCheckboxLabel: 'false',
        exportSurveyFields: 'false',
        exportDataAccessGroups: 'false',
        returnFormat: 'json',
      });
    });
  });

  describe('pushAccountToRedcap', () => {
    it('should return the count from fetchRedcap', async () => {
      const payload = { id: 'user-123', mail: 'test@example.com' };
      mockFetchRedcap.mockResolvedValue({ count: 1 });

      const result = await pushAccountToRedcap(token, payload, mockFetch);

      expect(result).toEqual({ count: 1 });
    });

    it('should call fetchRedcap with correct parameters', async () => {
      const payload = { id: 'user-123', mail: 'test@example.com' };
      mockFetchRedcap.mockResolvedValue({ count: 1 });

      await pushAccountToRedcap(token, payload, mockFetch);

      expect(mockFetchRedcap).toHaveBeenCalledWith(mockFetch, {
        token,
        content: 'record',
        action: 'import',
        format: 'json',
        type: 'flat',
        overwriteBehavior: 'normal',
        forceAutoNumber: 'false',
        data: JSON.stringify(payload),
        returnContent: 'count',
        returnFormat: 'json',
      });
    });

    it('should handle empty payload', async () => {
      const payload = {};
      mockFetchRedcap.mockResolvedValue({ count: 0 });

      const result = await pushAccountToRedcap(token, payload, mockFetch);

      expect(result).toEqual({ count: 0 });
    });

    it('should handle array payload', async () => {
      const payload = [{ id: 'user-1' }, { id: 'user-2' }];
      mockFetchRedcap.mockResolvedValue({ count: 2 });

      const result = await pushAccountToRedcap(token, payload, mockFetch);

      expect(result).toEqual({ count: 2 });
      expect(mockFetchRedcap).toHaveBeenCalledWith(
        mockFetch,
        expect.objectContaining({ data: JSON.stringify(payload) })
      );
    });
  });
});
