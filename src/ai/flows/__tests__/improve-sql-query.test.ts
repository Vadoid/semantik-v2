import { describe, it, expect, vi, beforeEach } from 'vitest';
import { improveSqlQuery } from '../improve-sql-query';

const { MockGenAI, mockGetGenerativeModel, mockGenerateContent } = vi.hoisted(() => {
  const mockGenerateContent = vi.fn();
  const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContent
  }));

  // Use a function declaration to ensure it's constructible
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

describe('improveSqlQuery', () => {
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = mockApiKey;

    // Reset implementations if needed, but hoisted defaults are usually fine
    // ensuring the return values are what we expect
    mockGetGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent
    });
  });

  it('should improve SQL query successfully', async () => {
    const mockOutput = {
      improvedSqlQuery: 'SELECT * FROM optimized_table',
      explanation: 'Optimized for performance',
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(mockOutput),
      },
    });

    const input = {
      sqlQuery: 'SELECT * FROM big_table',
      tableSchemaDescription: 'A very large table',
    };

    const result = await improveSqlQuery(input);

    expect(result).toEqual(mockOutput);
    expect(MockGenAI).toHaveBeenCalledWith(mockApiKey);
    expect(mockGetGenerativeModel).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-1.5-pro',
    }));
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('should throw error if API key is missing', async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(improveSqlQuery({
      sqlQuery: 'SELECT 1',
      tableSchemaDescription: 'test',
    })).rejects.toThrow('GEMINI_API_KEY is not set');
  });

  it('should throw error on invalid JSON response', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Invalid JSON',
      },
    });

    await expect(improveSqlQuery({
      sqlQuery: 'SELECT 1',
      tableSchemaDescription: 'test',
    })).rejects.toThrow('Failed to improve SQL query: Invalid response from AI model.');
  });
});
