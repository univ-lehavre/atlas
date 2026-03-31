import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSurveyUrl, deleteSurveyRecord, downloadSurvey } from './surveysService';

describe('surveysService', () => {
  const mockFetch = vi.fn();
  const token = 'test-token';
  const url = 'https://redcap.example.com/api/';
  const record = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  describe('getSurveyUrl', () => {
    it('should return survey URL from REDCap', async () => {
      mockFetch.mockResolvedValue({
        text: vi.fn().mockResolvedValue('https://survey.example.com/abc123'),
      });

      const result = await getSurveyUrl(token, url, record);

      expect(result).toBe('https://survey.example.com/abc123');
      expect(mockFetch).toHaveBeenCalledWith(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: expect.stringContaining('token=test-token'),
      });
    });

    it('should include instrument when provided', async () => {
      mockFetch.mockResolvedValue({
        text: vi.fn().mockResolvedValue('https://survey.example.com/abc123'),
      });

      await getSurveyUrl(token, url, record, 'my_instrument');

      expect(mockFetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({ body: expect.stringContaining('instrument=my_instrument') })
      );
    });

    it('should use empty string for instrument by default', async () => {
      mockFetch.mockResolvedValue({
        text: vi.fn().mockResolvedValue('https://survey.example.com/abc123'),
      });

      await getSurveyUrl(token, url, record);

      expect(mockFetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({ body: expect.stringContaining('instrument=&') })
      );
    });

    it('should include record in request', async () => {
      mockFetch.mockResolvedValue({
        text: vi.fn().mockResolvedValue('https://survey.example.com/abc123'),
      });

      await getSurveyUrl(token, url, record);

      expect(mockFetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({ body: expect.stringContaining(`record=${record}`) })
      );
    });
  });

  describe('deleteSurveyRecord', () => {
    it('should delete record from REDCap', async () => {
      mockFetch.mockResolvedValue({ text: vi.fn().mockResolvedValue('1') });

      const result = await deleteSurveyRecord(token, url, record);

      expect(result).toBe('1');
      expect(mockFetch).toHaveBeenCalledWith(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: expect.stringContaining('action=delete'),
      });
    });

    it('should include record in delete request', async () => {
      mockFetch.mockResolvedValue({ text: vi.fn().mockResolvedValue('1') });

      await deleteSurveyRecord(token, url, record);

      expect(mockFetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({ body: expect.stringContaining(`records%5B0%5D=${record}`) })
      );
    });
  });

  describe('downloadSurvey', () => {
    it('should download survey data from REDCap', async () => {
      const surveyData = [{ id: 'user-123', field1: 'value1' }];
      mockFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue(surveyData) });

      const result = await downloadSurvey(token, url, record);

      expect(result).toEqual(surveyData);
      expect(mockFetch).toHaveBeenCalledWith(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: expect.stringContaining('content=record'),
      });
    });

    it('should request flat format with labels', async () => {
      mockFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue([]) });

      await downloadSurvey(token, url, record);

      const callBody = mockFetch.mock.calls[0][1].body;
      expect(callBody).toContain('type=flat');
      expect(callBody).toContain('rawOrLabel=label');
      expect(callBody).toContain('rawOrLabelHeaders=label');
    });
  });
});
