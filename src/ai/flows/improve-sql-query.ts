'use server';

/**
 * @fileOverview AI-powered SQL query improvement flow.
 *
 * - improveSqlQuery - A function that accepts a SQL query and returns an improved version.
 * - ImproveSqlQueryInput - The input type for the improveSqlQuery function.
 * - ImproveSqlQueryOutput - The return type for the improveSqlQuery function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  return improveSqlQueryFlow(input);
}

const improveSqlQueryPrompt = ai.definePrompt({
  name: 'improveSqlQueryPrompt',
  input: {schema: ImproveSqlQueryInputSchema},
  output: {schema: ImproveSqlQueryOutputSchema},
  prompt: `You are an AI expert in optimizing SQL queries for cost-efficiency and comprehensiveness.

  Given the following SQL query and the schema of the BigQuery table, improve the query to be more cost-efficient and take into account all relevant columns.
  Also explain the changes you did.

  SQL Query:
  {{sqlQuery}}

  Table Schema Description:
  {{tableSchemaDescription}}

  Improved SQL Query:`, // Removed Handlebars brace
});

const improveSqlQueryFlow = ai.defineFlow(
  {
    name: 'improveSqlQueryFlow',
    inputSchema: ImproveSqlQueryInputSchema,
    outputSchema: ImproveSqlQueryOutputSchema,
  },
  async input => {
    const {output} = await improveSqlQueryPrompt(input);
    return output!;
  }
);
