'use server';

/**
 * @fileOverview A flow to generate insights from query results using AI.
 *
 * - generateDataInsights - A function that takes query results and returns insights.
 * - GenerateDataInsightsInput - The input type for the generateDataInsights function.
 * - GenerateDataInsightsOutput - The return type for the generateDataInsights function.
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { z } from 'zod';

const GenerateDataInsightsInputSchema = z.object({
  queryResults: z
    .string()
    .describe('The JSON string of query results from BigQuery.'),
});
export type GenerateDataInsightsInput = z.infer<typeof GenerateDataInsightsInputSchema>;

const GenerateDataInsightsOutputSchema = z.object({
  insights: z
    .string()
    .describe('The insights generated from the query results.'),
});
export type GenerateDataInsightsOutput = z.infer<typeof GenerateDataInsightsOutputSchema>;

export async function generateDataInsights(
  input: GenerateDataInsightsInput
): Promise<GenerateDataInsightsOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          insights: { type: SchemaType.STRING, description: 'The insights generated from the query results.' },
        },
        required: ['insights'],
      },
    },
  });

  const prompt = `You are an expert data analyst. Analyze the following query results from BigQuery and generate insights, key trends, and patterns.

Your response should be a single string, but formatted for readability with clear headings for each insight and paragraphs separated by double newline characters (\n\n).

Query Results:
${input.queryResults}`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  try {
    const parsed = JSON.parse(responseText);
    return GenerateDataInsightsOutputSchema.parse(parsed);
  } catch (error) {
    console.error('Failed to parse Gemini response:', responseText, error);
    throw new Error('Failed to generate insights: Invalid response from AI model.');
  }
}
