
'use server';

// import { BigQuery } from '@google-cloud/bigquery';
// import { GoogleAuth, OAuth2Client } from 'google-auth-library';

export async function getAuthenticatedClient(projectId: string, accessToken: string) {
  if (!accessToken) {
    throw new Error('Authentication token is missing. Please log in again.');
  }

  const { OAuth2Client } = await import('google-auth-library');
  const auth = new OAuth2Client();
  auth.setCredentials({ access_token: accessToken });

  const { BigQuery } = await import('@google-cloud/bigquery');
  const bigquery = new BigQuery({
    projectId,
    authClient: auth as any
  });

  return bigquery;
}


export async function runQuery(query: string, projectId: string, accessToken: string) {
  const bq = await getAuthenticatedClient(projectId, accessToken);

  const options = {
    query: query,
  };

  try {
    const [job] = await bq.createQueryJob(options);
    console.log(`Job ${job.id} started.`);

    const [rows] = await job.getQueryResults();

    console.log(`Job ${job.id} completed.`);
    return rows;
  } catch (error) {
    console.error('BigQuery Error:', error);
    if (error instanceof Error) {
      throw new Error(`BigQuery execution failed: ${error.message}`);
    }
    throw new Error('An unknown error occurred while querying BigQuery.');
  }
}

export async function dryRunQuery(query: string, projectId: string, accessToken: string) {
  const bq = await getAuthenticatedClient(projectId, accessToken);

  const options = {
    query: query,
    dryRun: true,
  };

  try {
    const [job] = await bq.createQueryJob(options);
    const stats = job.metadata.statistics;
    return {
      totalBytesProcessed: stats.totalBytesProcessed,
      totalBytesBilled: stats.totalBytesBilled,
      cacheHit: stats.query.cacheHit,
    };
  } catch (error) {
    console.error('BigQuery Dry Run Error:', error);
    if (error instanceof Error) {
      throw new Error(`BigQuery dry run failed: ${error.message}`);
    }
    throw new Error('An unknown error occurred during the BigQuery dry run.');
  }
}

export async function getDatasets(projectId: string, accessToken: string) {
  const bq = await getAuthenticatedClient(projectId, accessToken);
  const [datasets] = await bq.getDatasets();
  return datasets;
}

export async function getTables(projectId: string, datasetId: string, accessToken: string) {
  const bq = await getAuthenticatedClient(projectId, accessToken);
  const [tables] = await bq.dataset(datasetId).getTables();
  return tables;
}

export async function getTable(projectId: string, datasetId: string, tableId: string, accessToken: string) {
  const bq = await getAuthenticatedClient(projectId, accessToken);
  const [table] = await bq.dataset(datasetId).table(tableId).get();
  return table;
}

export async function createDataset(projectId: string, datasetId: string, location: string | undefined, accessToken: string) {
  const bq = await getAuthenticatedClient(projectId, accessToken);
  const dataset = bq.dataset(datasetId);
  const [exists] = await dataset.exists();
  if (!exists) {
    console.log(`Dataset ${datasetId} does not exist. Creating...`);
    try {
      await dataset.create({ location });
      console.log(`Dataset ${datasetId} created in ${location}.`);
    } catch (error) {
      console.error(`Failed to create dataset ${datasetId}:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to create BigQuery dataset: ${error.message}`);
      }
      throw new Error(`An unknown error occurred while creating dataset ${datasetId}.`);
    }
  }
}


export async function deleteDataset(projectId: string, datasetId: string, accessToken: string) {
  const bq = await getAuthenticatedClient(projectId, accessToken);
  const dataset = bq.dataset(datasetId);
  try {
    await dataset.delete({ force: true });
    console.log(`Dataset ${datasetId} deleted.`);
  } catch (error) {
    console.error(`Failed to delete dataset ${datasetId}:`, error);
    if (error instanceof Error) {
      throw new Error(`Failed to delete BigQuery dataset: ${error.message}`);
    }
    throw new Error(`An unknown error occurred while deleting dataset ${datasetId}.`);
  }
}

export async function deleteTable(projectId: string, datasetId: string, tableId: string, accessToken: string) {
  const bq = await getAuthenticatedClient(projectId, accessToken);
  const table = bq.dataset(datasetId).table(tableId);
  try {
    await table.delete();
    console.log(`Table ${datasetId}.${tableId} deleted.`);
  } catch (error) {
    console.error(`Failed to delete table ${tableId}:`, error);
    if (error instanceof Error) {
      throw new Error(`Failed to delete BigQuery table: ${error.message}`);
    }
    throw new Error(`An unknown error occurred while deleting table ${tableId}.`);
  }
}

export async function deleteView(projectId: string, datasetId: string, viewId: string, accessToken: string) {
  // In BigQuery, views are deleted using the same method as tables.
  return deleteTable(projectId, datasetId, viewId, accessToken);
}


export async function insertRows(
  projectId: string,
  datasetId: string,
  tableId: string,
  rows: any[],
  accessToken: string
) {
  const bq = await getAuthenticatedClient(projectId, accessToken);
  try {
    await bq.dataset(datasetId).table(tableId).insert(rows);
  } catch (e: any) {
    console.error('BigQuery Insert Error:', JSON.stringify(e.errors, null, 2));
    if (e instanceof Error) {
      throw new Error(`BigQuery insert failed: ${e.message}`);
    }
    throw new Error('An unknown error occurred while inserting rows into BigQuery.');
  }
}
