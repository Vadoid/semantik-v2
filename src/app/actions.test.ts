
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runBigQueryQuery, getTablesForDataset, getProjects, getBigQuerySchema } from './actions';
import * as bigqueryLib from '@/lib/bigquery';
import { OAuth2Client } from 'google-auth-library';


// Mock dependencies
vi.mock('@/lib/bigquery', () => ({
  getAuthenticatedClient: vi.fn(),
  runQuery: vi.fn(),
  getTables: vi.fn(),
  getDatasets: vi.fn(),
}));

vi.mock('google-auth-library', () => {
  return {
    OAuth2Client: vi.fn().mockImplementation(() => ({
      setCredentials: vi.fn(),
      request: vi.fn(),
    })),
  }
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn((name) => {
      if (name === 'gcp-access-token') return { value: 'mock-token' };
      return undefined;
    }),
  })),
}));

describe('runBigQueryQuery', () => {
  it('should serialize BigInts to strings', async () => {
    const mockResults = [
      { id: 123n, name: 'Test' },
      { count: 456n }
    ];

    vi.mocked(bigqueryLib.runQuery).mockResolvedValue(mockResults);

    const results = await runBigQueryQuery('SELECT *', 'project-id');

    expect(results).toEqual([
      { id: '123', name: 'Test' },
      { count: '456' }
    ]);
    expect(typeof results[0].id).toBe('string');
  });

  it('should handle nested objects with BigInts', async () => {
    const mockResults = [
      { stats: { total: 789n } }
    ];

    vi.mocked(bigqueryLib.runQuery).mockResolvedValue(mockResults);

    const results = await runBigQueryQuery('SELECT *', 'project-id');

    expect(results).toEqual([
      { stats: { total: '789' } }
    ]);
  });
});

describe('getTablesForDataset', () => {
  const mockBqClient = {
    query: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(bigqueryLib.getAuthenticatedClient).mockResolvedValue(mockBqClient as any);
  });

  it('should use INFORMATION_SCHEMA and map results correctly', async () => {
    const mockRows = [
      { table_id: 'table1', table_type: 'TABLE', creation_time: new Date(1600000000000), size_bytes: '1000', row_count: '50' },
      { table_id: 'view1', table_type: 'VIEW', creation_time: new Date(1600000000000), size_bytes: null, row_count: null }
    ];

    mockBqClient.query.mockResolvedValue([mockRows]);

    const tables = await getTablesForDataset('project-id', 'dataset-id');

    expect(tables).toHaveLength(2);
    expect(tables[0].name).toBe('table1');
    expect(tables[0].type).toBe('TABLE');
    expect(tables[0].numRows).toBe('50');
    expect(tables[1].type).toBe('VIEW');

    // Verify it called the correct query
    expect(mockBqClient.query).toHaveBeenCalledWith(expect.stringContaining('INFORMATION_SCHEMA.__TABLES__'));
  });

  it('should fallback to getTables if INFORMATION_SCHEMA fails', async () => {
    mockBqClient.query.mockRejectedValue(new Error('Permission denied'));

    const mockTablesFromFallback = [
      {
        id: 'fallback_table',
        getMetadata: vi.fn().mockResolvedValue([{
          description: 'Fallback',
          location: 'US',
          schema: { fields: [] },
          type: 'TABLE',
          numBytes: '500',
          numRows: '20'
        }]),
        metadata: { id: 'project-id:dataset-id.fallback_table' }
      }
    ];

    vi.mocked(bigqueryLib.getTables).mockResolvedValue(mockTablesFromFallback as any);

    const tables = await getTablesForDataset('project-id', 'dataset-id');

    expect(tables).toHaveLength(1);
    expect(tables[0].name).toBe('fallback_table');
    expect(tables[0].numRows).toBe('20');
    // Verify fallback was called
    expect(bigqueryLib.getTables).toHaveBeenCalled();
  });
});
