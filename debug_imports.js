
const { OAuth2Client } = require('google-auth-library');
const { BigQuery } = require('@google-cloud/bigquery');

console.log('OAuth2Client:', typeof OAuth2Client);
try {
    const auth = new OAuth2Client();
    console.log('OAuth2Client instance created');
} catch (e) {
    console.error('OAuth2Client instantiation failed:', e);
}

console.log('BigQuery:', typeof BigQuery);
try {
    const bq = new BigQuery({ projectId: 'test' });
    console.log('BigQuery instance created');
} catch (e) {
    console.error('BigQuery instantiation failed:', e);
}
