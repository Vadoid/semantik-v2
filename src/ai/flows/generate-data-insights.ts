'use server';

/**
 * @fileOverview A flow to generate insights from query results using AI.
 *
 * - generateDataInsights - A function that takes query results and returns insights.
 * - GenerateDataInsightsInput - The input type for the generateDataInsights function.
 * - GenerateDataInsightsOutput - The return type for the generateDataInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  return generateDataInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDataInsightsPrompt',
  input: {schema: GenerateDataInsightsInputSchema},
  output: {schema: GenerateDataInsightsOutputSchema},
  prompt: `You are an expert data analyst. Analyze the following query results from BigQuery and generate insights, key trends, and patterns.

Your response should be a single string, but formatted for readability with clear headings for each insight and paragraphs separated by double newline characters (\n\n).

Query Results:
{{queryResults}}`,
});

const generateDataInsightsFlow = ai.defineFlow(
  {
    name: 'generateDataInsightsFlow',
    inputSchema: GenerateDataInsightsInputSchema,
    outputSchema: GenerateDataInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
