import { describe, it, expect, vi } from 'vitest';
import { Effect, pipe } from 'effect';
import { createRedcapClient, escapeFilterLogicValue } from './client.js';
import { RedcapHttpError, RedcapApiError, RedcapNetworkError } from './errors.js';

describe('escapeFilterLogicValue', () => {
  it('should escape double quotes', () => {
    expect(escapeFilterLogicValue('test"value')).toBe('test\\"value');
  });

  it('should escape backslashes', () => {
    expect(escapeFilterLogicValue('test\\value')).toBe('test\\\\value');
  });

  it('should escape both quotes and backslashes', () => {
    expect(escapeFilterLogicValue('test\\"value')).toBe('test\\\\\\"value');
  });

  it('should return unchanged string if no special characters', () => {
    expect(escapeFilterLogicValue('testvalue')).toBe('testvalue');
  });
});

describe('createRedcapClient', () => {
  const mockConfig = {
    url: 'https://redcap.example.com/api/',
    token: 'test-token',
  };

  describe('exportRecords', () => {
    it('should return records on success', async () => {
      const mockRecords = [{ record_id: '1', name: 'Test' }];
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRecords),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.exportRecords(), Effect.runPromise);

      expect(result).toEqual(mockRecords);
      expect(mockFetch).toHaveBeenCalledWith(
        mockConfig.url,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );
    });

    it('should fail with RedcapHttpError on non-ok response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.exportRecords(), Effect.either, Effect.runPromise);

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(RedcapHttpError);
        expect((result.left as RedcapHttpError).status).toBe(401);
      }
    });

    it('should fail with RedcapApiError on API-level error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ error: 'Invalid token' }),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.exportRecords(), Effect.either, Effect.runPromise);

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(RedcapApiError);
        expect((result.left as RedcapApiError).message).toBe('Invalid token');
      }
    });

    it('should fail with RedcapNetworkError on fetch error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.exportRecords(), Effect.either, Effect.runPromise);

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(RedcapNetworkError);
      }
    });
  });

  describe('importRecords', () => {
    it('should return count on success', async () => {
      const mockResponse = { count: 5 };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const records = [{ record_id: '1' }, { record_id: '2' }];
      const result = await pipe(client.importRecords(records), Effect.runPromise);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('getSurveyLink', () => {
    it('should return survey URL on success', async () => {
      const surveyUrl = 'https://redcap.example.com/survey/abc123';
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(surveyUrl),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.getSurveyLink('1', 'my_survey'), Effect.runPromise);

      expect(result).toBe(surveyUrl);
    });
  });

  describe('findUserIdByEmail', () => {
    it('should return userId when found', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ userid: 'user123' }]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.findUserIdByEmail('test@example.com'), Effect.runPromise);

      expect(result).toBe('user123');
    });

    it('should return null when not found', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(
        client.findUserIdByEmail('notfound@example.com'),
        Effect.runPromise
      );

      expect(result).toBeNull();
    });

    it('should escape email in filterLogic', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(client.findUserIdByEmail('test"injection@example.com'), Effect.runPromise);

      const callBody = mockFetch.mock.calls[0]?.[1]?.body;
      expect(callBody).toContain('test%5C%22injection%40example.com'); // URL encoded escaped quote
    });
  });
});
