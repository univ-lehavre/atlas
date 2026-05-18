import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkAccountPushed, pushAccountToCrf } from './accountService';
import type { Fetch } from '$lib/types';

// Mock fetchCrf
vi.mock('$lib/crf/server', () => ({ fetchCrf: vi.fn() }));

import { fetchCrf } from '$lib/crf/server';

const mockFetchCrf = vi.mocked(fetchCrf);

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
      mockFetchCrf.mockResolvedValue([{ id: 'user-123', mail: 'test@example.com', active: 'Oui' }]);

      const result = await checkAccountPushed(token, id, email, mockFetch);

      expect(result).toEqual({
        hasPushedID: true,
        hasPushedEmail: true,
        hasPushedAccount: true,
        isActive: true,
      });
    });

    it('should return isActive true when active is "1"', async () => {
      mockFetchCrf.mockResolvedValue([{ id: 'user-123', mail: 'test@example.com', active: '1' }]);

      const result = await checkAccountPushed(token, id, email, mockFetch);

      expect(result.isActive).toBe(true);
    });

    it('should return hasPushedEmail false when email does not match', async () => {
      mockFetchCrf.mockResolvedValue([
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
      mockFetchCrf.mockResolvedValue([{ id: 'other-id', mail: 'test@example.com', active: 'Oui' }]);

      const result = await checkAccountPushed(token, id, email, mockFetch);

      expect(result).toEqual({
        hasPushedID: false,
        hasPushedEmail: true,
        hasPushedAccount: false,
        isActive: true,
      });
    });

    it('should return all false when user does not exist', async () => {
      mockFetchCrf.mockResolvedValue([]);

      const result = await checkAccountPushed(token, id, email, mockFetch);

      expect(result).toEqual({
        hasPushedID: false,
        hasPushedEmail: false,
        hasPushedAccount: false,
        isActive: false,
      });
    });

    it('should return isActive false when active is not "Oui" or "1"', async () => {
      mockFetchCrf.mockResolvedValue([{ id: 'user-123', mail: 'test@example.com', active: 'Non' }]);

      const result = await checkAccountPushed(token, id, email, mockFetch);

      expect(result.isActive).toBe(false);
    });

    it('should call fetchCrf with correct parameters', async () => {
      mockFetchCrf.mockResolvedValue([]);

      await checkAccountPushed(token, id, email, mockFetch);

      expect(mockFetchCrf).toHaveBeenCalledWith(mockFetch, {
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

  describe('pushAccountToCrf', () => {
    it('should return the count from fetchCrf', async () => {
      const payload = { id: 'user-123', mail: 'test@example.com' };
      mockFetchCrf.mockResolvedValue({ count: 1 });

      const result = await pushAccountToCrf(token, payload, mockFetch);

      expect(result).toEqual({ count: 1 });
    });

    it('should call fetchCrf with correct parameters', async () => {
      const payload = { id: 'user-123', mail: 'test@example.com' };
      mockFetchCrf.mockResolvedValue({ count: 1 });

      await pushAccountToCrf(token, payload, mockFetch);

      expect(mockFetchCrf).toHaveBeenCalledWith(mockFetch, {
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
      mockFetchCrf.mockResolvedValue({ count: 0 });

      const result = await pushAccountToCrf(token, payload, mockFetch);

      expect(result).toEqual({ count: 0 });
    });

    it('should handle array payload', async () => {
      const payload = [{ id: 'user-1' }, { id: 'user-2' }];
      mockFetchCrf.mockResolvedValue({ count: 2 });

      const result = await pushAccountToCrf(token, payload, mockFetch);

      expect(result).toEqual({ count: 2 });
      expect(mockFetchCrf).toHaveBeenCalledWith(
        mockFetch,
        expect.objectContaining({ data: JSON.stringify(payload) })
      );
    });
  });
});
