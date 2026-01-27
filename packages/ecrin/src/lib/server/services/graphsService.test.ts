import { describe, it, expect, vi, beforeEach } from 'vitest';
import Graph from 'graphology';

// Mock dependencies before importing the module
vi.mock('$lib/graph', () => ({ generateGraph: vi.fn() }));

import { generateGraph } from '$lib/graph';
import { fetchRecordsFromRedcap, fetchGraphForRecord, fetchGlobalGraph } from './graphsService';

const mockGenerateGraph = vi.mocked(generateGraph);

describe('graphsService', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  describe('fetchRecordsFromRedcap', () => {
    it('should fetch records from REDCap API', async () => {
      const mockData = [
        { record: '1', field_name: 'name', value: 'John' },
        { record: '1', field_name: 'email', value: 'john@example.com' },
      ];
      mockFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue(mockData) });

      const result = await fetchRecordsFromRedcap({ content: 'record' });

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith('https://redcap.example.com/api/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: expect.stringContaining('token=test-token'),
      });
    });

    it('should merge params with token', async () => {
      mockFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue([]) });

      await fetchRecordsFromRedcap({ content: 'record', format: 'json' });

      const callBody = mockFetch.mock.calls[0][1].body;
      expect(callBody).toContain('content=record');
      expect(callBody).toContain('format=json');
    });
  });

  describe('fetchGraphForRecord', () => {
    it('should fetch records and generate graph for specific record', async () => {
      const mockData = [{ record: 'user-123', field_name: 'topic', value: 'AI' }];
      const mockGraph = new Graph();
      mockGraph.addNode('user-123');

      mockFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue(mockData) });
      mockGenerateGraph.mockReturnValue(mockGraph);

      const result = await fetchGraphForRecord('user-123');

      expect(result).toBe(mockGraph);
      expect(mockGenerateGraph).toHaveBeenCalledWith(mockData);
    });

    it('should include record ID in request', async () => {
      mockFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue([]) });
      mockGenerateGraph.mockReturnValue(new Graph());

      await fetchGraphForRecord('user-456');

      const callBody = mockFetch.mock.calls[0][1].body;
      expect(callBody).toContain('records%5B0%5D=user-456');
    });

    it('should request EAV format', async () => {
      mockFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue([]) });
      mockGenerateGraph.mockReturnValue(new Graph());

      await fetchGraphForRecord('user-123');

      const callBody = mockFetch.mock.calls[0][1].body;
      expect(callBody).toContain('type=eav');
    });
  });

  describe('fetchGlobalGraph', () => {
    it('should fetch all records and generate global graph', async () => {
      const mockData = [
        { record: 'user-1', field_name: 'topic', value: 'AI' },
        { record: 'user-2', field_name: 'topic', value: 'ML' },
      ];
      const mockGraph = new Graph();
      mockGraph.addNode('user-1');
      mockGraph.addNode('user-2');

      mockFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue(mockData) });
      mockGenerateGraph.mockReturnValue(mockGraph);

      const result = await fetchGlobalGraph();

      expect(result).toBe(mockGraph);
      expect(mockGenerateGraph).toHaveBeenCalledWith(mockData);
    });

    it('should not include specific record filter', async () => {
      mockFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue([]) });
      mockGenerateGraph.mockReturnValue(new Graph());

      await fetchGlobalGraph();

      const callBody = mockFetch.mock.calls[0][1].body;
      expect(callBody).not.toContain('records%5B0%5D');
    });

    it('should request EAV format for global graph', async () => {
      mockFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue([]) });
      mockGenerateGraph.mockReturnValue(new Graph());

      await fetchGlobalGraph();

      const callBody = mockFetch.mock.calls[0][1].body;
      expect(callBody).toContain('type=eav');
      expect(callBody).toContain('content=record');
    });
  });
});
