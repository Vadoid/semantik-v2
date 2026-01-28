import { describe, it, expect, vi, beforeEach } from 'vitest';
import { proposeJoins } from '../propose-joins';

const { MockGenAI, mockGetGenerativeModel, mockGenerateContent } = vi.hoisted(() => {
  const mockGenerateContent = vi.fn();
  const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContent
  }));

  const MockGenAI = vi.fn(function () {
    return {
      getGenerativeModel: mockGetGenerativeModel
    };
  });

  return { MockGenAI, mockGetGenerativeModel, mockGenerateContent };
});

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: MockGenAI,
    SchemaType: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      ARRAY: 'ARRAY',
    },
  };
});

describe('proposeJoins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('should return empty array if less than 2 tables provided', async () => {
    const result = await proposeJoins({ tables: [{ id: 't1', name: 'T1', schema: [] }] });
    expect(result.proposals).toEqual([]);
    expect(mockGetGenerativeModel).not.toHaveBeenCalled();
  });

  it('should propose joins successfully', async () => {
    const mockOutput = {
      proposals: [
        {
          fromTable: 'users',
          fromField: 'id',
          toTable: 'orders',
          toField: 'user_id',
          cardinality: 'one-to-many',
          reason: 'Standard foreign key',
        },
      ],
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(mockOutput),
      },
    });

    const result = await proposeJoins({
      tables: [
        { id: 'users', name: 'Users', schema: [{ name: 'id', type: 'STRING', mode: 'NULLABLE' }] },
        { id: 'orders', name: 'Orders', schema: [{ name: 'user_id', type: 'STRING', mode: 'NULLABLE' }] },
      ],
    });

    expect(result).toEqual(mockOutput);
    expect(mockGetGenerativeModel).toHaveBeenCalled();
    expect(mockGenerateContent).toHaveBeenCalled();
  });
});
