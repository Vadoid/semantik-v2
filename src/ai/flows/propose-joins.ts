'use server';

/**
 * @fileOverview An AI flow to propose joins between tables based on their schemas.
 *
 * - proposeJoins - A function that takes table schemas and returns join proposals.
 * - ProposeJoinsInput - The input type for the proposeJoins function.
 * - ProposeJoinsOutput - The return type for the proposeJoins function.
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { z } from 'zod';

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
  const { tables } = input;
  if (tables.length < 2) {
    return { proposals: [] };
  }

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
          proposals: {
            type: SchemaType.ARRAY,
            description: 'An array of proposed joins between the tables.',
            items: {
              type: SchemaType.OBJECT,
              properties: {
                fromTable: { type: SchemaType.STRING, description: 'The ID of the source table for the join.' },
                fromField: { type: SchemaType.STRING, description: 'The field from the source table to join on.' },
                toTable: { type: SchemaType.STRING, description: 'The ID of the target table for the join.' },
                toField: { type: SchemaType.STRING, description: 'The field from the target table to join on.' },
                cardinality: { type: SchemaType.STRING, format: 'enum', enum: ['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many'], description: 'The proposed cardinality of the join.' },
                reason: { type: SchemaType.STRING, description: 'A brief explanation for why this join is being proposed.' },
              },
              required: ['fromTable', 'fromField', 'toTable', 'toField', 'cardinality', 'reason'],
            },
          },
        },
        required: ['proposals'],
      },
    },
  });

  // Helper to format tables for the prompt
  const tablesFormatted = tables.map(t => `
- Table Name: ${t.name} (ID: ${t.id})
  Schema:
  ${t.schema.map(s => `- ${s.name} (${s.type})`).join('\n  ')}
`).join('\n');

  const prompt = `You are an expert data architect specializing in database design and identifying relationships between tables.

Analyze the schemas of the following tables and propose logical joins between them.

Consider the following when making proposals:
- Exact matches in column names (e.g., 'customer_id' and 'customer_id').
- Common key naming conventions (e.g., 'id' in a 'customers' table and 'customer_id' in an 'orders' table).
- Plural vs. singular table names (e.g., 'customers' table vs 'customer_id' field).
- The likely cardinality based on the nature of the data. For instance, a join from a 'users' table to an 'orders' table on 'user_id' is likely one-to-many.

For each proposal, provide the source and target tables and fields, the cardinality, and a brief reason for your suggestion. Only propose joins between different tables.

Tables:
${tablesFormatted}`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  try {
    const parsed = JSON.parse(responseText);
    return ProposeJoinsOutputSchema.parse(parsed);
  } catch (error) {
    console.error('Failed to parse Gemini response:', responseText, error);
    throw new Error('Failed to propose joins: Invalid response from AI model.');
  }
}
