import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Fetch } from '$lib/types';

// Mock the redcap module
vi.mock('$lib/server/redcap', () => ({ fetchRedcapJSON: vi.fn(), fetchRedcapText: vi.fn() }));

// Mock node-appwrite
vi.mock('node-appwrite', () => ({ ID: { unique: vi.fn(() => 'mock-id') } }));

describe('surveys service - fetchUserId', () => {
  it('should escape double quotes in email addresses', async () => {
    const { fetchUserId } = await import('$lib/server/services/surveys');
    const { fetchRedcapJSON } = await import('$lib/server/redcap');
    const mockFetchRedcapJSON = fetchRedcapJSON as unknown as ReturnType<typeof vi.fn>;

    mockFetchRedcapJSON.mockResolvedValue([{ userid: 'user123' }]);

    const mockFetch = vi.fn() as unknown as Fetch;
    await fetchUserId('test"quote@example.com', { fetch: mockFetch });

    // Verify that the filterLogic has escaped the double quote
    expect(mockFetchRedcapJSON).toHaveBeenCalledWith(
      expect.objectContaining({ filterLogic: '[email] = "test\\"quote@example.com"' }),
      expect.any(Object)
    );
  });

  it('should escape backslashes in email addresses', async () => {
    const { fetchUserId } = await import('$lib/server/services/surveys');
    const { fetchRedcapJSON } = await import('$lib/server/redcap');
    const mockFetchRedcapJSON = fetchRedcapJSON as unknown as ReturnType<typeof vi.fn>;

    mockFetchRedcapJSON.mockResolvedValue([{ userid: 'user456' }]);

    const mockFetch = vi.fn() as unknown as Fetch;
    await fetchUserId('test\\backslash@example.com', { fetch: mockFetch });

    // Verify that the filterLogic has escaped the backslash
    expect(mockFetchRedcapJSON).toHaveBeenCalledWith(
      expect.objectContaining({ filterLogic: '[email] = "test\\\\backslash@example.com"' }),
      expect.any(Object)
    );
  });

  it('should handle normal email addresses without special characters', async () => {
    const { fetchUserId } = await import('$lib/server/services/surveys');
    const { fetchRedcapJSON } = await import('$lib/server/redcap');
    const mockFetchRedcapJSON = fetchRedcapJSON as unknown as ReturnType<typeof vi.fn>;

    mockFetchRedcapJSON.mockResolvedValue([{ userid: 'user789' }]);

    const mockFetch = vi.fn() as unknown as Fetch;
    await fetchUserId('normal@example.com', { fetch: mockFetch });

    // Verify that the filterLogic is correctly formatted
    expect(mockFetchRedcapJSON).toHaveBeenCalledWith(
      expect.objectContaining({ filterLogic: '[email] = "normal@example.com"' }),
      expect.any(Object)
    );
  });

  it('should handle email addresses with both backslashes and quotes', async () => {
    const { fetchUserId } = await import('$lib/server/services/surveys');
    const { fetchRedcapJSON } = await import('$lib/server/redcap');
    const mockFetchRedcapJSON = fetchRedcapJSON as unknown as ReturnType<typeof vi.fn>;

    mockFetchRedcapJSON.mockResolvedValue([{ userid: 'user101' }]);

    const mockFetch = vi.fn() as unknown as Fetch;
    await fetchUserId('test\\"mixed@example.com', { fetch: mockFetch });

    // Verify that both backslashes and quotes are properly escaped
    expect(mockFetchRedcapJSON).toHaveBeenCalledWith(
      expect.objectContaining({ filterLogic: '[email] = "test\\\\\\"mixed@example.com"' }),
      expect.any(Object)
    );
  });
});

describe('surveys service - downloadSurvey', () => {
  it('should escape special characters in userid', async () => {
    const { downloadSurvey } = await import('$lib/server/services/surveys');
    const { fetchRedcapJSON } = await import('$lib/server/redcap');
    const mockFetchRedcapJSON = fetchRedcapJSON as unknown as ReturnType<typeof vi.fn>;

    mockFetchRedcapJSON.mockResolvedValue({});

    const mockFetch = vi.fn() as unknown as Fetch;
    await downloadSurvey('user"123', { fetch: mockFetch });

    // Verify that the filterLogic has escaped the double quote
    expect(mockFetchRedcapJSON).toHaveBeenCalledWith(
      expect.objectContaining({ filterLogic: '[userid] = "user\\"123"' }),
      expect.any(Object)
    );
  });

  it('should limit export to form and validation_finale instruments', async () => {
    const { downloadSurvey } = await import('$lib/server/services/surveys');
    const { fetchRedcapJSON } = await import('$lib/server/redcap');
    const mockFetchRedcapJSON = fetchRedcapJSON as unknown as ReturnType<typeof vi.fn>;

    mockFetchRedcapJSON.mockResolvedValue([]);

    const mockFetch = vi.fn() as unknown as Fetch;
    await downloadSurvey('user123', { fetch: mockFetch });

    // Verify that forms parameter limits to form and validation_finale
    expect(mockFetchRedcapJSON).toHaveBeenCalledWith(
      expect.objectContaining({ forms: 'form,validation_finale' }),
      expect.any(Object)
    );
  });
});

describe('surveys service - listRequests', () => {
  it('should escape special characters in userid', async () => {
    const { listRequests } = await import('$lib/server/services/surveys');
    const { fetchRedcapJSON } = await import('$lib/server/redcap');
    const mockFetchRedcapJSON = fetchRedcapJSON as unknown as ReturnType<typeof vi.fn>;

    mockFetchRedcapJSON.mockResolvedValue([]);

    const mockFetch = vi.fn() as unknown as Fetch;
    await listRequests('user"456', { fetch: mockFetch });

    // Verify that the filterLogic has escaped the double quote
    expect(mockFetchRedcapJSON).toHaveBeenCalledWith(
      expect.objectContaining({ filterLogic: '[userid] = "user\\"456"' }),
      expect.any(Object)
    );
  });
});

describe('fetchUserId', () => {
  let fetchUserId: (email: string, opts: { fetch: Fetch }) => Promise<string | null>;

  beforeEach(async () => {
    ({ fetchUserId } = await import('$lib/server/services/surveys'));
  });

  it('returns userid when user exists', async () => {
    const { fetchRedcapJSON } = await import('$lib/server/redcap');
    const mockFetchRedcapJSON = fetchRedcapJSON as unknown as ReturnType<typeof vi.fn>;

    mockFetchRedcapJSON.mockResolvedValue([{ userid: 'user_123' }]);

    const result = await fetchUserId('test@example.com', { fetch: vi.fn() });

    expect(result).toBe('user_123');
    expect(mockFetchRedcapJSON).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'flat',
        fields: 'userid',
        rawOrLabel: 'raw',
        rawOrLabelHeaders: 'raw',
        exportCheckboxLabel: 'false',
        exportSurveyFields: 'false',
        exportDataAccessGroups: 'false',
        returnFormat: 'json',
        filterLogic: '[email] = "test@example.com"',
      }),
      { fetch: expect.any(Function) }
    );
  });

  it('returns null when no matching user found (empty results)', async () => {
    const { fetchRedcapJSON } = await import('$lib/server/redcap');
    const mockFetchRedcapJSON = fetchRedcapJSON as unknown as ReturnType<typeof vi.fn>;

    mockFetchRedcapJSON.mockResolvedValue([]);

    const result = await fetchUserId('nonexistent@example.com', { fetch: vi.fn() });

    expect(result).toBeNull();
  });

  it('returns userid from first record when multiple matching records exist', async () => {
    const { fetchRedcapJSON } = await import('$lib/server/redcap');
    const mockFetchRedcapJSON = fetchRedcapJSON as unknown as ReturnType<typeof vi.fn>;

    mockFetchRedcapJSON.mockResolvedValue([
      { userid: 'user_first' },
      { userid: 'user_second' },
      { userid: 'user_third' },
    ]);

    const result = await fetchUserId('duplicate@example.com', { fetch: vi.fn() });

    expect(result).toBe('user_first');
  });

  it('returns null when userid field is missing in the response', async () => {
    const { fetchRedcapJSON } = await import('$lib/server/redcap');
    const mockFetchRedcapJSON = fetchRedcapJSON as unknown as ReturnType<typeof vi.fn>;

    mockFetchRedcapJSON.mockResolvedValue([{}]);

    const result = await fetchUserId('test@example.com', { fetch: vi.fn() });

    expect(result).toBeNull();
  });

  it('returns null when userid field is empty string', async () => {
    const { fetchRedcapJSON } = await import('$lib/server/redcap');
    const mockFetchRedcapJSON = fetchRedcapJSON as unknown as ReturnType<typeof vi.fn>;

    mockFetchRedcapJSON.mockResolvedValue([{ userid: '' }]);

    const result = await fetchUserId('test@example.com', { fetch: vi.fn() });

    expect(result).toBeNull();
  });

  it('propagates API errors from fetchRedcapJSON', async () => {
    const { fetchRedcapJSON } = await import('$lib/server/redcap');
    const mockFetchRedcapJSON = fetchRedcapJSON as unknown as ReturnType<typeof vi.fn>;

    const apiError = new Error('REDCap API error');
    mockFetchRedcapJSON.mockRejectedValue(apiError);

    await expect(fetchUserId('test@example.com', { fetch: vi.fn() })).rejects.toThrow(
      'REDCap API error'
    );
  });

  it('handles network errors from fetchRedcapJSON', async () => {
    const { fetchRedcapJSON } = await import('$lib/server/redcap');
    const mockFetchRedcapJSON = fetchRedcapJSON as unknown as ReturnType<typeof vi.fn>;

    const networkError = new Error('Network failure');
    mockFetchRedcapJSON.mockRejectedValue(networkError);

    await expect(fetchUserId('test@example.com', { fetch: vi.fn() })).rejects.toThrow(
      'Network failure'
    );
  });
});
