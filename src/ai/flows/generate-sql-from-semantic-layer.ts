
'use server';

/**
 * @fileOverview An AI flow to generate a SQL CREATE VIEW statement from a semantic layer definition.
 *
 * - generateSqlFromSemanticLayer - A function that takes tables, relationships, and selected fields and returns a SQL query.
 * - GenerateSqlInput - The input type for the function.
 * - GenerateSqlOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TableSchema = z.object({
  id: z.string(),
  name: z.string(),
  schema: z.array(z.object({
    name: z.string(),
    type: z.string(),
    mode: z.string().optional(),
  })),
  description: z.string(),
  location: z.string(),
  numBytes: z.string().optional(),
});

const RelationshipSchema = z.object({
  id: z.string(),
  fromTable: z.string(),
  fromField: z.string(),
  toTable: z.string(),
  toField: z.string(),
  cardinality: z.enum(['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many']),
});

const SelectedFieldsSchema = z.record(z.array(z.string()));

const GenerateSqlInputSchema = z.object({
  viewName: z.string().describe('The name for the new SQL view.'),
  tables: z.array(TableSchema).describe('An array of tables included in the view.'),
  relationships: z.array(RelationshipSchema).describe('The relationships (joins) between the tables.'),
  selectedFields: SelectedFieldsSchema.describe('A map of table IDs to their selected fields.'),
  projectId: z.string().describe('The Google Cloud project ID.'),
});

const GenerateSqlOutputSchema = z.object({
  sqlQuery: z.string().describe('The generated CREATE VIEW SQL query.'),
});

export type GenerateSqlInput = z.infer<typeof GenerateSqlInputSchema>;
export type GenerateSqlOutput = z.infer<typeof GenerateSqlOutputSchema>;


export async function generateSqlFromSemanticLayer(input: GenerateSqlInput): Promise<GenerateSqlOutput> {
  return generateSqlFromSemanticLayerFlow(input);
}


const generateSqlFromSemanticLayerFlow = ai.defineFlow(
  {
    name: 'generateSqlFromSemanticLayerFlow',
    inputSchema: GenerateSqlInputSchema,
    outputSchema: GenerateSqlOutputSchema,
  },
  async (input) => {
    const { tables, relationships, selectedFields, viewName, projectId } = input;

    // If no tables are in the workspace, create a placeholder view.
    if (tables.length === 0) {
      return { sqlQuery: `CREATE OR REPLACE VIEW \`${projectId}.semantic_views.${viewName}\` AS\nSELECT 1;` };
    }
    
    // Create a map for quick table lookups by ID.
    const allTablesById = new Map(tables.map(t => [t.id, t]));

    // Determine the base table for the FROM clause.
    // Use the 'from' table of the first relationship, or the largest table if no relationships exist.
    const baseTable = relationships.length > 0 
        ? allTablesById.get(relationships[0].fromTable)!
        : [...tables].sort((a, b) => Number(b.numBytes || 0) - Number(a.numBytes || 0))[0];

    // --- Graph Traversal to build the final list of tables and joins ---
    const finalTables = new Set<string>([baseTable.id]);
    const finalJoins: { rel: z.infer<typeof RelationshipSchema>, fromAlias: string, toAlias: string }[] = [];
    const tableToAlias = new Map<string, string>();
    const aliasToTableId = new Map<string, string>();
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    let aliasIndex = 0;

    // Assign alias to base table
    const baseAlias = alphabet[aliasIndex++];
    tableToAlias.set(baseTable.id, baseAlias);
    aliasToTableId.set(baseAlias, baseTable.id);

    const remainingRelationships = new Set(relationships);
    let newTablesAdded = true;

    // Loop until no new tables can be joined to the graph.
    while (newTablesAdded) {
        newTablesAdded = false;
        for (const rel of Array.from(remainingRelationships)) {
            const fromTableId = rel.fromTable;
            const toTableId = rel.toTable;
            const toTableDetails = allTablesById.get(toTableId);

            // If the 'from' side of the relationship is already in our graph, we can add the 'to' side.
            if (finalTables.has(fromTableId) && toTableDetails) {
                const fromAlias = tableToAlias.get(fromTableId)!;
                
                // Assign a new, unique alias for this join instance.
                const toAlias = alphabet[aliasIndex++];
                
                finalJoins.push({ rel, fromAlias, toAlias });
                finalTables.add(toTableId);
                tableToAlias.set(`${rel.id}_${toTableId}`, toAlias); // Use a unique key for the 'to' side alias mapping
                
                remainingRelationships.delete(rel);
                newTablesAdded = true;
            }
        }
    }
    
    // --- Construct SELECT clause ---
    const selectFields: string[] = [];
    const addedFields = new Set<string>();

    for(const table of tables) {
      if(selectedFields[table.id] && selectedFields[table.id].length > 0) {
        selectedFields[table.id].forEach(field => {
          let fieldAlias: string | null = null;
          let tableAlias: string | undefined;

          // Find the correct alias for the current table and field.
          if(table.id === baseTable.id) {
            tableAlias = tableToAlias.get(table.id);
            const cleanTableName = table.name.replace(/_external$/, '');
            fieldAlias = `${cleanTableName}_${field}`;
          } else {
             for(const join of finalJoins) {
              if(join.rel.toTable === table.id) {
                tableAlias = join.toAlias;
                const cleanFromTableName = allTablesById.get(join.rel.fromTable)!.name.replace(/_external$/, '');
                const cleanToTableName = allTablesById.get(join.rel.toTable)!.name.replace(/_external$/, '');
                const joinKeyName = join.rel.fromField.replace(/_id$/, '').replace(/_code$/i, '').replace(/airport$/i, '');
                fieldAlias = `${cleanFromTableName}_${joinKeyName}_${cleanToTableName}_${field}`;
                break;
              }
            }
          }

          if (tableAlias && fieldAlias && !addedFields.has(fieldAlias)) {
            selectFields.push(`    ${tableAlias}.${field} AS ${fieldAlias}`);
            addedFields.add(fieldAlias);
          }
        });
      }
    }

    // Fallback if no fields are selected.
    if (selectFields.length === 0) {
        selectFields.push('    1 as no_fields_selected');
    }

    const selectClause = `SELECT\n${selectFields.join(',\n')}`;
    
    // --- Construct FROM and JOIN clauses ---
    const fromClause = `FROM\n    \`${baseTable.id}\` AS ${baseAlias}`;
    const joinClauses = finalJoins.map(j => {
        const toTableDetails = allTablesById.get(j.rel.toTable)!;
        return `LEFT JOIN \`${toTableDetails.id}\` AS ${j.toAlias} ON ${j.fromAlias}.${j.rel.fromField} = ${j.toAlias}.${j.rel.toField}`;
    });
    const joinClauseStr = joinClauses.join('\n');
    
    const fromAndJoins = `${fromClause}${joinClauseStr ? '\n' + joinClauseStr : ''}`;
    const sqlQuery = `CREATE OR REPLACE VIEW \`${projectId}.semantic_views.${viewName}\` AS\n${selectClause}\n${fromAndJoins};`;

    return { sqlQuery };
  }
);
