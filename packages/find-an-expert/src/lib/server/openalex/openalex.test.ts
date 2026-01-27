import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchInstitutions } from './service';
import { OpenAlexApiError, OpenAlexParseError } from './errors';
import { OpenAlexInstitution, Institution, InstitutionSearchResponse } from './types';

describe('openalex service', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchInstitutions', () => {
    it('should return empty results for empty query', async () => {
      const result = await searchInstitutions('');

      expect(result.institutions).toEqual([]);
      expect(result.meta.count).toBe(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return empty results for whitespace-only query', async () => {
      const result = await searchInstitutions('   ');

      expect(result.institutions).toEqual([]);
      expect(result.meta.count).toBe(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should search and return institutions', async () => {
      const mockResponse = {
        meta: {
          count: 2,
          db_response_time_ms: 150,
          page: 1,
          per_page: 10,
        },
        results: [
          {
            id: 'https://openalex.org/I1234',
            display_name: 'University of Test',
            hint: 'Test City, USA',
            cited_by_count: 1000000,
            works_count: 50000,
            entity_type: 'institution' as const,
            external_id: 'https://ror.org/test',
          },
          {
            id: 'https://openalex.org/I5678',
            display_name: 'Test Institute',
            hint: null,
            cited_by_count: 500000,
            works_count: 25000,
            entity_type: 'institution' as const,
            external_id: null,
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await searchInstitutions('test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.openalex.org/autocomplete/institutions?q=test'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/json',
          }),
        })
      );
      expect(result.institutions).toHaveLength(2);
      expect(result.institutions[0]).toEqual({
        id: 'https://openalex.org/I1234',
        displayName: 'University of Test',
        location: 'Test City, USA',
        citedByCount: 1000000,
        worksCount: 50000,
      });
      expect(result.institutions[1]).toEqual({
        id: 'https://openalex.org/I5678',
        displayName: 'Test Institute',
        location: null,
        citedByCount: 500000,
        worksCount: 25000,
      });
      expect(result.meta.count).toBe(2);
      expect(result.meta.responseTimeMs).toBe(150);
    });

    it('should URL encode the search query', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            meta: { count: 0, db_response_time_ms: 50, page: 1, per_page: 10 },
            results: [],
          }),
      } as Response);

      await searchInstitutions('MIT & Harvard');

      // URLSearchParams encodes spaces as + and & as %26
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=MIT+%26+Harvard'),
        expect.any(Object)
      );
    });

    it('should throw OpenAlexApiError on non-OK response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(searchInstitutions('test')).rejects.toThrow(OpenAlexApiError);
    });

    it('should throw OpenAlexApiError on network error', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      await expect(searchInstitutions('test')).rejects.toThrow(OpenAlexApiError);
    });

    it('should throw OpenAlexParseError on invalid response format', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' }),
      } as Response);

      await expect(searchInstitutions('test')).rejects.toThrow(OpenAlexParseError);
    });
  });
});

describe('openalex errors', () => {
  describe('OpenAlexApiError', () => {
    it('should have correct properties', () => {
      const error = new OpenAlexApiError('Test error', { cause: 'test cause' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('openalex_api_error');
      expect(error.httpStatus).toBe(502);
      expect(error.cause).toBe('test cause');
    });

    it('should use default message', () => {
      const error = new OpenAlexApiError();

      expect(error.message).toBe('OpenAlex API error');
    });
  });

  describe('OpenAlexParseError', () => {
    it('should have correct properties', () => {
      const error = new OpenAlexParseError('Parse error', { cause: 'invalid JSON' });

      expect(error.message).toBe('Parse error');
      expect(error.code).toBe('openalex_parse_error');
      expect(error.httpStatus).toBe(502);
      expect(error.cause).toBe('invalid JSON');
    });

    it('should use default message', () => {
      const error = new OpenAlexParseError();

      expect(error.message).toBe('Failed to parse OpenAlex response');
    });
  });
});

describe('openalex types', () => {
  describe('OpenAlexInstitution schema', () => {
    it('should validate valid institution', () => {
      const validInstitution = {
        id: 'https://openalex.org/I123',
        display_name: 'Test University',
        hint: 'Test City',
        cited_by_count: 1000,
        works_count: 500,
        entity_type: 'institution' as const,
        external_id: 'https://ror.org/test',
      };

      const result = OpenAlexInstitution.safeParse(validInstitution);

      expect(result.success).toBe(true);
    });

    it('should allow null hint', () => {
      const institution = {
        id: 'https://openalex.org/I123',
        display_name: 'Test University',
        hint: null,
        cited_by_count: 1000,
        works_count: 500,
        entity_type: 'institution' as const,
        external_id: null,
      };

      const result = OpenAlexInstitution.safeParse(institution);

      expect(result.success).toBe(true);
    });

    it('should reject invalid entity_type', () => {
      const institution = {
        id: 'https://openalex.org/I123',
        display_name: 'Test University',
        hint: null,
        cited_by_count: 1000,
        works_count: 500,
        entity_type: 'author',
        external_id: null,
      };

      const result = OpenAlexInstitution.safeParse(institution);

      expect(result.success).toBe(false);
    });
  });

  describe('Institution schema', () => {
    it('should validate simplified institution', () => {
      const institution = {
        id: 'https://openalex.org/I123',
        displayName: 'Test University',
        location: 'Test City',
        citedByCount: 1000,
        worksCount: 500,
      };

      const result = Institution.safeParse(institution);

      expect(result.success).toBe(true);
    });
  });

  describe('InstitutionSearchResponse schema', () => {
    it('should validate search response', () => {
      const response = {
        institutions: [
          {
            id: 'https://openalex.org/I123',
            displayName: 'Test University',
            location: 'Test City',
            citedByCount: 1000,
            worksCount: 500,
          },
        ],
        meta: {
          count: 1,
          responseTimeMs: 100,
        },
      };

      const result = InstitutionSearchResponse.safeParse(response);

      expect(result.success).toBe(true);
    });
  });
});
