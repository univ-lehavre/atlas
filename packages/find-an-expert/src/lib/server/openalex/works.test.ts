import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getWorksCount, getInstitutionStats } from './works';
import { OpenAlexApiError, OpenAlexParseError } from './errors';

describe('openalex works service', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getWorksCount', () => {
    it('should return zero count for empty institution array', async () => {
      const result = await getWorksCount([]);

      expect(result.count).toBe(0);
      expect(result.institutionCount).toBe(0);
      expect(result.responseTimeMs).toBe(0);
      expect(result.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return count for single institution', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ meta: { count: 1234, db_response_time_ms: 50 } }),
      } as Response);

      const result = await getWorksCount(['I136199984']);

      expect(result.count).toBe(1234);
      expect(result.institutionCount).toBe(1);
      expect(result.responseTimeMs).toBe(50);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should return count for multiple institutions', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ meta: { count: 5678, db_response_time_ms: 100 } }),
      } as Response);

      const result = await getWorksCount(['I136199984', 'I27837315', 'I12345678']);

      expect(result.count).toBe(5678);
      expect(result.institutionCount).toBe(3);
    });

    it('should include institutions filter in URL', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ meta: { count: 100, db_response_time_ms: 50 } }),
      } as Response);

      await getWorksCount(['I136199984', 'I27837315']);

      const url = vi.mocked(global.fetch).mock.calls[0][0] as string;
      // URL is encoded: : becomes %3A, | becomes %7C
      expect(url).toContain('authorships.institutions.id%3AI136199984%7CI27837315');
    });

    it('should include type:article filter', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ meta: { count: 100, db_response_time_ms: 50 } }),
      } as Response);

      await getWorksCount(['I136199984']);

      const url = vi.mocked(global.fetch).mock.calls[0][0] as string;
      // URL is encoded: : becomes %3A
      expect(url).toContain('type%3Aarticle');
    });

    it('should include from_publication_date filter', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ meta: { count: 100, db_response_time_ms: 50 } }),
      } as Response);

      await getWorksCount(['I136199984']);

      const url = vi.mocked(global.fetch).mock.calls[0][0] as string;
      // URL is encoded: : becomes %3A
      expect(url).toMatch(/from_publication_date%3A\d{4}-\d{2}-\d{2}/);
    });

    it('should use optimized query parameters (select=id, per_page=1)', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ meta: { count: 100, db_response_time_ms: 50 } }),
      } as Response);

      await getWorksCount(['I136199984']);

      const url = vi.mocked(global.fetch).mock.calls[0][0] as string;
      expect(url).toContain('select=id');
      expect(url).toContain('per_page=1');
    });

    it('should include mailto when email provided', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ meta: { count: 100, db_response_time_ms: 50 } }),
      } as Response);

      await getWorksCount(['I136199984'], 'user@example.com');

      const url = vi.mocked(global.fetch).mock.calls[0][0] as string;
      expect(url).toContain('mailto=user%40example.com');
    });

    it('should not include mailto when email not provided', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ meta: { count: 100, db_response_time_ms: 50 } }),
      } as Response);

      await getWorksCount(['I136199984']);

      const url = vi.mocked(global.fetch).mock.calls[0][0] as string;
      expect(url).not.toContain('mailto');
    });

    it('should throw OpenAlexApiError on HTTP 500', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('No JSON')),
      } as Response);

      await expect(getWorksCount(['I136199984'])).rejects.toThrow(OpenAlexApiError);
    });

    it('should throw OpenAlexApiError on HTTP 404', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.reject(new Error('No JSON')),
      } as Response);

      await expect(getWorksCount(['I136199984'])).rejects.toThrow(OpenAlexApiError);
    });

    it('should include error details from response body on HTTP 400', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () =>
          Promise.resolve({
            error: 'Invalid filter: type:invalid is not a valid type value',
          }),
      } as Response);

      await expect(getWorksCount(['I136199984'])).rejects.toThrow(
        /OpenAlex API returned 400: Invalid filter: type:invalid is not a valid type value/
      );
    });

    it('should include message from response body when error field is missing', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () =>
          Promise.resolve({
            message: 'Bad request: invalid institution ID format',
          }),
      } as Response);

      await expect(getWorksCount(['I136199984'])).rejects.toThrow(
        /Bad request: invalid institution ID format/
      );
    });

    it('should include filter in error message for debugging', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: 'Invalid query' }),
      } as Response);

      await expect(getWorksCount(['I136199984'])).rejects.toThrow(/\[filter:/);
    });

    it('should throw OpenAlexApiError on network error', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      await expect(getWorksCount(['I136199984'])).rejects.toThrow(OpenAlexApiError);
    });

    it('should throw OpenAlexParseError on invalid response format', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' }),
      } as Response);

      await expect(getWorksCount(['I136199984'])).rejects.toThrow(OpenAlexParseError);
    });

    it('should throw OpenAlexParseError when meta is missing', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      } as Response);

      await expect(getWorksCount(['I136199984'])).rejects.toThrow(OpenAlexParseError);
    });

    it('should throw OpenAlexParseError when count is not a number', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ meta: { count: 'not a number', db_response_time_ms: 50 } }),
      } as Response);

      await expect(getWorksCount(['I136199984'])).rejects.toThrow(OpenAlexParseError);
    });

    it('should include proper headers in request', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ meta: { count: 100, db_response_time_ms: 50 } }),
      } as Response);

      await getWorksCount(['I136199984']);

      const options = vi.mocked(global.fetch).mock.calls[0][1] as RequestInit;
      expect(options.headers).toEqual(
        expect.objectContaining({
          Accept: 'application/json',
        })
      );
    });
  });

  describe('getInstitutionStats', () => {
    const currentYear = new Date().getFullYear();
    const oldestYear = currentYear - 5;

    /**
     * Creates a mock group_by response with year data.
     * @param yearCounts - Map of year to count
     * @returns Mock response object
     */
    const createGroupByResponse = (yearCounts: Record<number, number>) => ({
      meta: {
        count: Object.values(yearCounts).reduce((a, b) => a + b, 0),
        db_response_time_ms: 30,
      },
      group_by: Object.entries(yearCounts).map(([year, count]) => ({
        key: year,
        key_display_name: year,
        count,
      })),
    });

    it('should return zero counts for empty institution array', async () => {
      const result = await getInstitutionStats([]);

      expect(result.worksCount).toBe(0);
      expect(result.articlesCount).toBe(0);
      expect(result.authorsCount).toBe(0);
      expect(result.institutionCount).toBe(0);
      expect(result.responseTimeMs).toBe(0);
      // 7 entries: 'before' + 6 years (current + 5 previous)
      expect(result.articlesByYear).toHaveLength(7);
      expect(result.articlesByYear[0]).toEqual({ year: 'before', count: 0 });
      expect(result.articlesByYear.every((y) => y.count === 0)).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return all counts for single institution using group_by', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString();
        if (urlStr.includes('group_by')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve(
                createGroupByResponse({
                  [currentYear]: 100,
                  [currentYear - 1]: 90,
                  [currentYear - 2]: 80,
                  [currentYear - 3]: 70,
                  [currentYear - 4]: 60,
                  [currentYear - 5]: 50,
                  [currentYear - 6]: 40, // before
                  [currentYear - 10]: 20, // before
                })
              ),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ meta: { count: 1000, db_response_time_ms: 30 } }),
        } as Response);
      });

      const result = await getInstitutionStats(['I136199984']);

      expect(result.worksCount).toBe(1000);
      expect(result.authorsCount).toBe(1000);
      expect(result.institutionCount).toBe(1);
      // Only 3 requests now: works, group_by articles, authors
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should calculate before count from years older than displayed range', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString();
        if (urlStr.includes('group_by')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve(
                createGroupByResponse({
                  [currentYear]: 100,
                  [currentYear - 5]: 50,
                  [currentYear - 6]: 40, // before
                  [currentYear - 10]: 30, // before
                  [currentYear - 20]: 10, // before
                })
              ),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ meta: { count: 500, db_response_time_ms: 20 } }),
        } as Response);
      });

      const result = await getInstitutionStats(['I136199984']);

      // 'before' should be first
      expect(result.articlesByYear[0]).toEqual({ year: 'before', count: 80 }); // 40 + 30 + 10
      // Check specific years are correctly mapped
      expect(result.articlesByYear[1]).toEqual({ year: oldestYear, count: 50 });
      expect(result.articlesByYear[6]).toEqual({ year: currentYear, count: 100 });
      // articlesCount should only include displayed years (not 'before')
      expect(result.articlesCount).toBe(150); // 100 + 50
    });

    it('should use group_by=publication_year for articles', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString();
        if (urlStr.includes('group_by')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createGroupByResponse({ [currentYear]: 100 })),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ meta: { count: 100, db_response_time_ms: 20 } }),
        } as Response);
      });

      await getInstitutionStats(['I136199984']);

      const calls = vi.mocked(global.fetch).mock.calls;
      const groupByCall = calls.find((call) => call[0].toString().includes('group_by'));
      expect(groupByCall).toBeDefined();
      expect(groupByCall![0].toString()).toContain('group_by=publication_year');
      expect(groupByCall![0].toString()).toContain('type%3Aarticle');
    });

    it('should include correct filters for works (publication_year filter)', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString();
        if (urlStr.includes('group_by')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createGroupByResponse({ [currentYear]: 100 })),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ meta: { count: 100, db_response_time_ms: 20 } }),
        } as Response);
      });

      await getInstitutionStats(['I136199984']);

      const worksUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
      expect(worksUrl).toContain('works');
      expect(worksUrl).toContain('authorships.institutions.id');
      expect(worksUrl).toContain('publication_year');
    });

    it('should include correct filters for authors (affiliations filter)', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString();
        if (urlStr.includes('group_by')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createGroupByResponse({ [currentYear]: 100 })),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ meta: { count: 100, db_response_time_ms: 20 } }),
        } as Response);
      });

      await getInstitutionStats(['I136199984']);

      const authorsUrl = vi.mocked(global.fetch).mock.calls[2][0] as string;
      expect(authorsUrl).toContain('authors');
      expect(authorsUrl).toContain('affiliations.institution.id');
    });

    it('should include mailto in all requests when email provided', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString();
        if (urlStr.includes('group_by')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createGroupByResponse({ [currentYear]: 100 })),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ meta: { count: 100, db_response_time_ms: 20 } }),
        } as Response);
      });

      await getInstitutionStats(['I136199984'], 'user@example.com');

      const calls = vi.mocked(global.fetch).mock.calls;
      // All 3 requests should have mailto
      expect(calls).toHaveLength(3);
      calls.forEach((call) => {
        expect(call[0]).toContain('mailto=user%40example.com');
      });
    });

    it('should not include mailto when email not provided', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString();
        if (urlStr.includes('group_by')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createGroupByResponse({ [currentYear]: 100 })),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ meta: { count: 100, db_response_time_ms: 20 } }),
        } as Response);
      });

      await getInstitutionStats(['I136199984']);

      const calls = vi.mocked(global.fetch).mock.calls;
      calls.forEach((call) => {
        expect(call[0]).not.toContain('mailto');
      });
    });

    it('should throw OpenAlexApiError if any request fails', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ meta: { count: 100, db_response_time_ms: 20 } }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as Response);

      await expect(getInstitutionStats(['I136199984'])).rejects.toThrow(OpenAlexApiError);
    });

    it('should throw OpenAlexParseError on invalid authors response', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString();
        if (urlStr.includes('/authors')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ invalid: 'response' }),
          } as Response);
        }
        if (urlStr.includes('group_by')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createGroupByResponse({ [currentYear]: 100 })),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ meta: { count: 100, db_response_time_ms: 20 } }),
        } as Response);
      });

      await expect(getInstitutionStats(['I136199984'])).rejects.toThrow(OpenAlexParseError);
    });

    it('should throw OpenAlexParseError on invalid group_by response', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString();
        if (urlStr.includes('group_by')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ meta: { count: 100, db_response_time_ms: 20 } }), // missing group_by
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ meta: { count: 100, db_response_time_ms: 20 } }),
        } as Response);
      });

      await expect(getInstitutionStats(['I136199984'])).rejects.toThrow(OpenAlexParseError);
    });

    it('should handle multiple institutions', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString();
        if (urlStr.includes('group_by')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createGroupByResponse({ [currentYear]: 100 })),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ meta: { count: 5000, db_response_time_ms: 50 } }),
        } as Response);
      });

      const result = await getInstitutionStats(['I136199984', 'I27837315', 'I12345678']);

      expect(result.institutionCount).toBe(3);

      const calls = vi.mocked(global.fetch).mock.calls;
      expect(calls[0][0]).toContain('I136199984%7CI27837315%7CI12345678');
    });

    it('should handle years with zero articles gracefully', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString();
        if (urlStr.includes('group_by')) {
          // Only return data for some years
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve(
                createGroupByResponse({
                  [currentYear]: 100,
                  [currentYear - 2]: 50,
                  // Missing years should default to 0
                })
              ),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ meta: { count: 150, db_response_time_ms: 20 } }),
        } as Response);
      });

      const result = await getInstitutionStats(['I136199984']);

      // Check that missing years are filled with 0
      const year1 = result.articlesByYear.find((y) => y.year === currentYear - 1);
      expect(year1?.count).toBe(0);
      const year3 = result.articlesByYear.find((y) => y.year === currentYear - 3);
      expect(year3?.count).toBe(0);
    });
  });
});
