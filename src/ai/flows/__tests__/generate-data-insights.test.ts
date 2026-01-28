import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDataInsights } from '../generate-data-insights';

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

describe('generateDataInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';

    mockGetGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent
    });
  });

  it('should generate insights successfully', async () => {
    const mockOutput = {
      insights: 'Sales are up 50%.',
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(mockOutput),
      },
    });

    const input = {
      queryResults: JSON.stringify([{ sales: 150 }, { sales: 100 }]),
    };

    const result = await generateDataInsights(input);

    expect(result).toEqual(mockOutput);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors gracefully', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API Error'));

    await expect(generateDataInsights({
      queryResults: '[]',
    })).rejects.toThrow('API Error');
  });
});
