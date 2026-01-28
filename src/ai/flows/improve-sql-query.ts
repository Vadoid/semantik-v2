'use server';

/**
 * @fileOverview AI-powered SQL query improvement flow.
 *
 * - improveSqlQuery - A function that accepts a SQL query and returns an improved version.
 * - ImproveSqlQueryInput - The input type for the improveSqlQuery function.
 * - ImproveSqlQueryOutput - The return type for the improveSqlQuery function.
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { z } from 'zod';

const ImproveSqlQueryInputSchema = z.object({
  sqlQuery: z.string().describe('The SQL query to improve.'),
  tableSchemaDescription: z
    .string()
    .describe('Description of the BigQuery table schema to take into account when improving the query.'),
});
export type ImproveSqlQueryInput = z.infer<typeof ImproveSqlQueryInputSchema>;

const ImproveSqlQueryOutputSchema = z.object({
  improvedSqlQuery: z.string().describe('The improved SQL query.'),
  explanation: z
    .string()
    .describe('Explanation of the improvements made to the query.'),
});
export type ImproveSqlQueryOutput = z.infer<typeof ImproveSqlQueryOutputSchema>;

export async function improveSqlQuery(input: ImproveSqlQueryInput): Promise<ImproveSqlQueryOutput> {
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
          improvedSqlQuery: { type: SchemaType.STRING, description: 'The improved SQL query.' },
          explanation: { type: SchemaType.STRING, description: 'Explanation of the improvements made to the query.' },
        },
        required: ['improvedSqlQuery', 'explanation'],
      },
    },
  });

  const prompt = `You are an AI expert in optimizing SQL queries for cost-efficiency and comprehensiveness.

  Given the following SQL query and the schema of the BigQuery table, improve the query to be more cost-efficient and take into account all relevant columns.
  Also explain the changes you did.

  SQL Query:
  ${input.sqlQuery}

  Table Schema Description:
  ${input.tableSchemaDescription}
  `;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  try {
    const parsed = JSON.parse(responseText);
    // Validate with Zod to ensure type safety
    return ImproveSqlQueryOutputSchema.parse(parsed);
  } catch (error) {
    console.error('Failed to parse Gemini response:', responseText, error);
    throw new Error('Failed to improve SQL query: Invalid response from AI model.');
  }
}
