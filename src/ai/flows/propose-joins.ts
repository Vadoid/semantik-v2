'use server';

/**
 * @fileOverview An AI flow to propose joins between tables based on their schemas.
 *
 * - proposeJoins - A function that takes table schemas and returns join proposals.
 * - ProposeJoinsInput - The input type for the proposeJoins function.
 * - ProposeJoinsOutput - The return type for the proposeJoins function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TableInputSchema = z.object({
    id: z.string().describe('The unique ID of the table, usually in project.dataset.table format.'),
    name: z.string().describe('The display name of the table.'),
    schema: z.array(z.object({
        name: z.string(),
        type: z.string(),
        mode: z.string(),
    })).describe('The schema of the table.'),
});

const ProposeJoinsInputSchema = z.object({
  tables: z.array(TableInputSchema).describe('An array of tables with their schemas.'),
});

const JoinProposalSchema = z.object({
    fromTable: z.string().describe('The ID of the source table for the join.'),
    fromField: z.string().describe('The field from the source table to join on.'),
    toTable: z.string().describe('The ID of the target table for the join.'),
    toField: z.string().describe('The field from the target table to join on.'),
    cardinality: z.enum(['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many']).describe('The proposed cardinality of the join.'),
    reason: z.string().describe('A brief explanation for why this join is being proposed.'),
});

const ProposeJoinsOutputSchema = z.object({
  proposals: z.array(JoinProposalSchema).describe('An array of proposed joins between the tables.'),
});

export type ProposeJoinsInput = z.infer<typeof ProposeJoinsInputSchema>;
export type ProposeJoinsOutput = z.infer<typeof ProposeJoinsOutputSchema>;

export async function proposeJoins(input: ProposeJoinsInput): Promise<ProposeJoinsOutput> {
  return proposeJoinsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'proposeJoinsPrompt',
  input: { schema: ProposeJoinsInputSchema },
  output: { schema: ProposeJoinsOutputSchema },
  prompt: `You are an expert data architect specializing in database design and identifying relationships between tables.

Analyze the schemas of the following tables and propose logical joins between them.

Consider the following when making proposals:
- Exact matches in column names (e.g., 'customer_id' and 'customer_id').
- Common key naming conventions (e.g., 'id' in a 'customers' table and 'customer_id' in an 'orders' table).
- Plural vs. singular table names (e.g., 'customers' table vs 'customer_id' field).
- The likely cardinality based on the nature of the data. For instance, a join from a 'users' table to an 'orders' table on 'user_id' is likely one-to-many.

For each proposal, provide the source and target tables and fields, the cardinality, and a brief reason for your suggestion. Only propose joins between different tables.

Tables:
{{#each tables}}
- Table Name: {{name}} (ID: {{id}})
  Schema:
  {{#each schema}}
  - {{name}} ({{type}})
  {{/each}}
{{/each}}
`,
});

const proposeJoinsFlow = ai.defineFlow(
  {
    name: 'proposeJoinsFlow',
    inputSchema: ProposeJoinsInputSchema,
    outputSchema: ProposeJoinsOutputSchema,
  },
  async (input) => {
    if (input.tables.length < 2) {
      return { proposals: [] };
    }
    const { output } = await prompt(input);
    return output!;
  }
);
