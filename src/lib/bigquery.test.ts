
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthenticatedClient, runQuery, dryRunQuery, getDatasets, getTables, createDataset, deleteDataset, deleteTable, insertRows } from './bigquery';
import { BigQuery } from '@google-cloud/bigquery';
import { OAuth2Client } from 'google-auth-library';

// Mock dependencies
vi.mock('@google-cloud/bigquery', () => ({
  BigQuery: vi.fn(),
}));

vi.mock('google-auth-library', () => {
  return {
    OAuth2Client: vi.fn(() => ({
      setCredentials: vi.fn(),
      getTokenInfo: vi.fn(),
    })),
    GoogleAuth: vi.fn(),
  };
});

describe('src/lib/bigquery', () => {
  let mockBqClient: any;
  let mockAuthClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBqClient = {
      createQueryJob: vi.fn(),
      dataset: vi.fn(),
      getDatasets: vi.fn(),
    };

    (BigQuery as unknown as any).mockImplementation(function (this: any) {
      return mockBqClient;
    });

    mockAuthClient = {
      setCredentials: vi.fn(),
      getTokenInfo: vi.fn(),
    };
    (OAuth2Client as unknown as any).mockImplementation(function (this: any) {
      return mockAuthClient;
    });
  });

  describe('getAuthenticatedClient', () => {
    it('should throw error if accessToken is missing', async () => {
      await expect(getAuthenticatedClient('project-id', '')).rejects.toThrow('Authentication token is missing');
    });

    it('should return BigQuery client with credentials', async () => {
      const client = await getAuthenticatedClient('project-id', 'valid-token');
      expect(OAuth2Client).toHaveBeenCalled();
      expect(mockAuthClient.setCredentials).toHaveBeenCalledWith({ access_token: 'valid-token' });
      expect(BigQuery).toHaveBeenCalledWith({ projectId: 'project-id', authClient: mockAuthClient });
      expect(client).toBe(mockBqClient);
    });
  });

  describe('runQuery', () => {
    it('should execute query and return rows', async () => {
      const mockJob = {
        id: 'job-123',
        getQueryResults: vi.fn().mockResolvedValue([['row1', 'row2']]),
      };
      mockBqClient.createQueryJob.mockResolvedValue([mockJob]);

      const rows = await runQuery('SELECT *', 'project-id', 'token');

      expect(mockBqClient.createQueryJob).toHaveBeenCalledWith({ query: 'SELECT *' });
      expect(mockJob.getQueryResults).toHaveBeenCalled();
      expect(rows).toEqual(['row1', 'row2']);
    });

    it('should throw error on failure', async () => {
      mockBqClient.createQueryJob.mockRejectedValue(new Error('BQ Error'));
      await expect(runQuery('SELECT *', 'project-id', 'token')).rejects.toThrow('BigQuery execution failed: BQ Error');
    });
  });

  describe('dryRunQuery', () => {
    it('should execute dry run and return stats', async () => {
      const mockJob = {
        metadata: {
          statistics: {
            totalBytesProcessed: '100',
            totalBytesBilled: '200',
            query: { cacheHit: true }
          }
        }
      };
      mockBqClient.createQueryJob.mockResolvedValue([mockJob]);

      const stats = await dryRunQuery('SELECT *', 'project-id', 'token');

      expect(mockBqClient.createQueryJob).toHaveBeenCalledWith({ query: 'SELECT *', dryRun: true });
      expect(stats).toEqual({
        totalBytesProcessed: '100',
        totalBytesBilled: '200',
        cacheHit: true
      });
    });
  });

  // Add more tests as needed for other functions...
});
