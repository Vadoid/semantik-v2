
'use server';

import { runQuery, getDatasets, getTables, dryRunQuery, createDataset, getAuthenticatedClient, deleteDataset, deleteTable, insertRows, getTable as getBqTable, deleteView as deleteBqView } from '@/lib/bigquery';
import type { Project, Dataset, Table } from '@/lib/bigquery-mock';
// import { OAuth2Client } from 'google-auth-library';
import type { BigQuery } from '@google-cloud/bigquery';
import { cookies } from 'next/headers';

async function getAccessToken(): Promise<string> {
    const cookieStore = await cookies();
    const token = cookieStore.get('gcp-access-token')?.value;
    if (!token) {
        throw new Error('Authentication with Google Cloud failed. Please log in again.');
    }
    return token;
}

export async function runBigQueryQuery(query: string, projectId: string) {
    const accessToken = await getAccessToken();
    try {
        const results = await runQuery(query, projectId, accessToken);
        // BigQuery returns rows which may contain non-serializable types like BigInts.
        // We use a custom serializer to handle BigInts more efficiently than JSON.parse/stringify
        const serializeValue = (value: any): any => {
            if (typeof value === 'bigint') {
                return value.toString();
            }
            if (value instanceof Date) {
                return value.toISOString();
            }
            if (Array.isArray(value)) {
                return value.map(serializeValue);
            }
            if (typeof value === 'object' && value !== null) {
                const newObj: any = {};
                for (const key in value) {
                    newObj[key] = serializeValue(value[key]);
                }
                return newObj;
            }
            return value;
        };

        return serializeValue(results);
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unexpected error occurred.');
    }
}

export async function dryRunBigQueryQuery(query: string, projectId: string) {
    const accessToken = await getAccessToken();
    try {
        const stats = await dryRunQuery(query, projectId, accessToken);
        return stats;
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unexpected error occurred during dry run.');
    }
}

export async function getBigQuerySchema(projectId: string): Promise<Project[]> {
    const accessToken = await getAccessToken();
    try {
        const datasets = await getDatasets(projectId, accessToken);

        const project: Project = {
            id: projectId,
            name: projectId,
            datasets: datasets.map((dataset) => {
                const datasetId = dataset.id!;
                return {
                    id: datasetId,
                    name: datasetId,
                    tables: [] // Tables will be lazy-loaded
                };
            })
        };
        return [project];
    } catch (error) {
        console.error('Failed to fetch BigQuery schema:', error);
        // Re-throw the original error to preserve its specific message
        if (error instanceof Error) {
            if (error.message.includes('Authentication with Google Cloud failed')) {
                throw new Error('Authentication with Google Cloud failed. Please log in again.');
            }
            throw error;
        }
        throw new Error('An unknown error occurred while fetching the BigQuery schema.');
    }
}

export async function getTablesForDataset(projectId: string, datasetId: string): Promise<Table[]> {
    const accessToken = await getAccessToken();
    try {
        // Optimization: Use INFORMATION_SCHEMA to fetch all table metadata in a single query
        // instead of getting tables and then fetching metadata for each one (N+1 problem).
        const query = `
            SELECT 
                table_id, 
                table_type, 
                creation_time, 
                row_count, 
                size_bytes 
            FROM \`${projectId}.${datasetId}.INFORMATION_SCHEMA.__TABLES__\`
        `;

        try {
            const bq = await getAuthenticatedClient(projectId, accessToken);
            const [rows] = await bq.query(query);

            return rows.map((row: { table_id: string; table_type: string; creation_time: number | string | Date; size_bytes: string | number; row_count: string | number }) => ({
                id: `${projectId}.${datasetId}.${row.table_id}`,
                name: row.table_id,
                description: '', // INFORMATION_SCHEMA.__TABLES__ doesn't have description, but that's acceptable for list view
                location: '', // Not needed for list view usually
                schema: [], // Schema is loaded on demand when selecting table
                type: row.table_type === 'VIEW' ? 'VIEW' : 'TABLE',
                creationTime: row.creation_time ? BigInt(new Date(row.creation_time).getTime()).toString() : undefined,
                lastModifiedTime: undefined, // Not available in simple __TABLES__ view
                numBytes: row.size_bytes ? BigInt(row.size_bytes).toString() : undefined,
                numRows: row.row_count ? BigInt(row.row_count).toString() : undefined,
                // Partitioning info not available in simple view, but acceptable for loading list
            }));
        } catch (infoSchemaError) {
            console.warn('Failed to query INFORMATION_SCHEMA, falling back to standard API:', infoSchemaError);

            // Fallback to original method if INFORMATION_SCHEMA fails (e.g. lack of permissions)
            const tables = await getTables(projectId, datasetId, accessToken);
            return await Promise.all(tables.map(async (table) => {
                const tableId = table.id!;
                const [metadata] = await table.getMetadata();

                const baseTable: Table = {
                    id: table.metadata.id.replace(/:/g, '.'),
                    name: tableId,
                    description: metadata.description || `Schema for ${tableId}`,
                    location: metadata.location,
                    schema: metadata.schema.fields.map((field: any) => ({
                        name: field.name,
                        type: field.type,
                        mode: field.mode || 'NULLABLE',
                    })),
                    type: metadata.type,
                    creationTime: metadata.creationTime,
                    lastModifiedTime: metadata.lastModifiedTime,
                };

                // Native tables have storage stats, external tables do not.
                if (metadata.type === 'TABLE' || metadata.type === 'VIEW' || metadata.type === 'MATERIALIZED_VIEW') {
                    baseTable.numBytes = metadata.numBytes;
                    baseTable.numRows = metadata.numRows;
                    baseTable.timePartitioning = metadata.timePartitioning;
                    baseTable.rangePartitioning = metadata.rangePartitioning;
                }

                return baseTable;
            }));
        }
    } catch (error) {
        console.error(`Failed to fetch tables for dataset ${datasetId}:`, error);
        // Re-throw the original error to preserve its specific message
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unknown error occurred while fetching tables.');
    }
}


export async function getProjects(): Promise<{ id: string, name: string }[]> {
    const accessToken = await getAccessToken();
    try {
        const googleAuthLib = await import('google-auth-library');
        console.log('googleAuthLib keys:', Object.keys(googleAuthLib));
        const { OAuth2Client } = googleAuthLib;
        console.log('OAuth2Client type:', typeof OAuth2Client);
        if (!OAuth2Client) {
            console.error('OAuth2Client is undefined in google-auth-library import');
            throw new Error('OAuth2Client is undefined');
        }
        const auth = new OAuth2Client();
        auth.setCredentials({ access_token: accessToken });

        const res = await auth.request<{ projects: { projectId: string, displayName: string }[] }>({
            url: 'https://cloudresourcemanager.googleapis.com/v1/projects'
        });

        if (!res.data.projects) {
            return [];
        }

        return res.data.projects.map((p: { projectId: string; displayName: string }) => ({ id: p.projectId, name: p.displayName }));
    } catch (error: any) {
        console.error('Failed to fetch projects:', error);
        // Check for specific error messages related to invalid credentials
        const errorMessage = error.response?.data?.error?.message || error.message || '';
        if (errorMessage.includes('invalid') || errorMessage.includes('expired')) {
            throw new Error('Invalid Credentials. Please log in again.');
        }
        throw new Error(`An error occurred while fetching projects: ${errorMessage}`);
    }
}

export async function checkDatasetExists(projectId: string, datasetId: string): Promise<boolean> {
    const accessToken = await getAccessToken();
    try {
        const bq = await getAuthenticatedClient(projectId, accessToken);
        const [exists] = await bq.dataset(datasetId).exists();
        return exists;
    } catch (error) {
        console.error('Error checking dataset existence:', error);
        if (error instanceof Error) {
            // Re-throw with a more user-friendly message if possible
            if (error.message.includes('permission')) {
                throw new Error('Permission denied to check for dataset existence in BigQuery.');
            }
            throw error;
        }
        throw new Error('An unexpected error occurred while checking for the dataset.');
    }
}


export async function createSemanticView(projectId: string, sqlQuery: string) {
    const accessToken = await getAccessToken();
    try {
        await runQuery(sqlQuery, projectId, accessToken);
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unexpected error occurred while creating the semantic view.');
    }
}

export async function createBqDataset(projectId: string, datasetId: string, location: string | undefined) {
    const accessToken = await getAccessToken();
    try {
        await createDataset(projectId, datasetId, location, accessToken);
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unexpected error occurred while creating dataset.');
    }
}


export async function deleteBqDataset(projectId: string, datasetId: string) {
    const accessToken = await getAccessToken();
    try {
        await deleteDataset(projectId, datasetId, accessToken);
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unexpected error occurred while deleting dataset.');
    }
}

export async function deleteBqTable(projectId: string, datasetId: string, tableId: string) {
    const accessToken = await getAccessToken();
    try {
        await deleteTable(projectId, datasetId, tableId, accessToken);
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unexpected error occurred while deleting table.');
    }
}


export async function upsertSemanticViewMetadata(
    projectId: string,
    datasetId: string,
    tableId: string,
    viewName: string,
    config: object,
    userDisplayName: string
) {
    const accessToken = await getAccessToken();
    try {
        const bq = await getAuthenticatedClient(projectId, accessToken);
        const dataset = bq.dataset(datasetId);
        const table = dataset.table(tableId);
        let tableExists = true;

        try {
            await table.get();
        } catch (e: any) {
            if (e.code === 404) {
                tableExists = false;
            } else {
                throw e;
            }
        }

        if (!tableExists) {
            const schema = [
                { name: 'view_name', type: 'STRING', mode: 'REQUIRED' },
                { name: 'config', type: 'JSON', mode: 'REQUIRED' },
                { name: 'last_updated', type: 'TIMESTAMP', mode: 'REQUIRED' },
                { name: 'created_by', type: 'STRING', mode: 'NULLABLE' },
                { name: 'last_updated_by', type: 'STRING', mode: 'NULLABLE' },
                { name: 'version', type: 'INTEGER', mode: 'REQUIRED' },
                { name: 'status', type: 'STRING', mode: 'REQUIRED' },
            ];
            await table.create({ schema });
        }

        // Get the latest version
        const versionQuery = `
      SELECT MAX(version) as latest_version
      FROM \`${projectId}.${datasetId}.${tableId}\`
      WHERE view_name = @view_name
    `;
        const [versionRows] = await bq.query({ query: versionQuery, params: { view_name: viewName } });
        const newVersion = (versionRows[0]?.latest_version || 0) + 1;

        // Insert new version
        const insertQuery = `
        INSERT INTO \`${projectId}.${datasetId}.${tableId}\`
            (view_name, config, last_updated, created_by, last_updated_by, version, status)
        VALUES
            (@view_name, PARSE_JSON(@config), @last_updated, @created_by, @last_updated_by, @version, @status);
    `;

        const params = {
            view_name: viewName,
            config: JSON.stringify(config),
            last_updated: new Date(),
            created_by: userDisplayName,
            last_updated_by: userDisplayName,
            version: newVersion,
            status: 'active',
        };

        await bq.query({ query: insertQuery, params });

    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unexpected error occurred while saving the view metadata.');
    }
}

export async function getSemanticViewConfig(projectId: string, viewName: string) {
    const accessToken = await getAccessToken();
    const query = `
      SELECT t.config
      FROM \`${projectId}.semantic_views.semantic_views_metadata\` t
      JOIN (
          SELECT view_name, MAX(version) as latest_version
          FROM \`${projectId}.semantic_views.semantic_views_metadata\`
          WHERE view_name = @view_name AND status = 'active'
          GROUP BY view_name
      ) latest ON t.view_name = latest.view_name AND t.version = latest.latest_version
      WHERE t.view_name = @view_name
    `;
    const params = { view_name: viewName };
    try {
        const bq = await getAuthenticatedClient(projectId, accessToken);
        const [rows] = await bq.query({ query, params });
        if (rows.length > 0) {
            return JSON.parse(rows[0].config);
        }
        return null;
    } catch (e: any) {
        if (e.message.includes('Not found')) {
            return null;
        }
        throw e;
    }
}


export async function getTableDetails(projectId: string, tableId: string): Promise<Table> {
    const accessToken = await getAccessToken();
    const [p, d, t] = tableId.split('.');
    const table = await getBqTable(projectId, d, t, accessToken);
    const [metadata] = await table.getMetadata();

    return {
        id: table.metadata.id.replace(/:/g, '.'),
        name: t,
        description: metadata.description || `Schema for ${t}`,
        location: metadata.location,
        schema: metadata.schema.fields.map((field: any) => ({
            name: field.name,
            type: field.type,
            mode: field.mode,
        })),
        type: metadata.type,
        creationTime: metadata.creationTime,
        lastModifiedTime: metadata.lastModifiedTime,
        numBytes: metadata.numBytes,
        numRows: metadata.numRows,
        timePartitioning: metadata.timePartitioning,
        rangePartitioning: metadata.rangePartitioning,
    };
}

export async function deleteSemanticView(projectId: string, viewName: string): Promise<void> {
    const accessToken = await getAccessToken();
    const bq = await getAuthenticatedClient(projectId, accessToken);

    // 1. Delete the actual view from BigQuery
    try {
        await deleteBqView(projectId, 'semantic_views', viewName, accessToken);
    } catch (e: any) {
        // If the view is already gone, we don't need to fail the whole operation.
        if (e.code !== 404) {
            console.error(`Failed to delete BigQuery view '${viewName}':`, e);
            if (e instanceof Error) {
                throw new Error(`Failed to delete BigQuery view: ${e.message}`);
            }
            throw new Error('An unknown error occurred while deleting the BigQuery view.');
        }
        console.log(`BigQuery view '${viewName}' not found. Skipping deletion.`);
    }

    // 2. Mark all versions of the view's metadata as 'deleted'
    const updateQuery = `
        UPDATE \`${projectId}.semantic_views.semantic_views_metadata\`
        SET status = 'deleted'
        WHERE view_name = @view_name
    `;

    try {
        await bq.query({
            query: updateQuery,
            params: { view_name: viewName },
        });
    } catch (e: any) {
        // This could fail if the metadata table doesn't exist, which is acceptable.
        if (!e.message.includes('Not found')) {
            console.error(`Failed to mark semantic view '${viewName}' as deleted in metadata:`, e);
            if (e instanceof Error) {
                throw new Error(`Failed to update metadata status: ${e.message}`);
            }
            throw new Error('An unknown error occurred while updating the view metadata.');
        }
    }
}
