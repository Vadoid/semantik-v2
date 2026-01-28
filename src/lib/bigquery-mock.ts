
export type TableSchema = {
  name: string;
  type: string;
  mode: string;
};

export type Table = {
  id: string;
  name: string;
  schema: TableSchema[];
  description: string;
  location: string;
  type: string;
  creationTime?: string;
  lastModifiedTime?: string;
  numBytes?: string;
  numRows?: string;
  timePartitioning?: {
    type: string;
    field: string;
    expirationMs?: string;
  };
  rangePartitioning?: {
    field: string;
    range: {
        start: string;
        end: string;
        interval: string;
    }
  }
};

export type Dataset = {
  id: string;
  name: string;
  tables: Table[];
};

export type Project = {
  id: string;
  name: string;
  datasets: Dataset[];
};

export const mockProjects: Project[] = [
  {
    id: 'enterprise-gcp-project',
    name: 'Enterprise GCP Project',
    datasets: [
      {
        id: 'sales_data',
        name: 'Sales Data',
        tables: [
          {
            id: 'quarterly_sales',
            name: 'Quarterly Sales',
            description: 'This table contains quarterly sales data including product information, region, and revenue.',
            location: 'US',
            type: 'TABLE',
            schema: [
              { name: 'product_id', type: 'STRING', mode: 'NULLABLE' },
              { name: 'product_name', type: 'STRING', mode: 'NULLABLE' },
              { name: 'category', type: 'STRING', mode: 'NULLABLE' },
              { name: 'region', type: 'STRING', mode: 'NULLABLE' },
              { name: 'quarter', type: 'STRING', mode: 'NULLABLE' },
              { name: 'year', type: 'INTEGER', mode: 'NULLABLE' },
              { name: 'units_sold', type: 'INTEGER', mode: 'NULLABLE' },
              { name: 'revenue', type: 'FLOAT', mode: 'NULLABLE' },
            ],
          },
          {
            id: 'customer_feedback',
            name: 'Customer Feedback',
            description: 'Contains customer feedback scores and comments for different products and services.',
            location: 'US',
            type: 'TABLE',
            schema: [
              { name: 'feedback_id', type: 'STRING', mode: 'REQUIRED' },
              { name: 'customer_id', type: 'STRING', mode: 'NULLABLE' },
              { name: 'product_id', type: 'STRING', mode: 'NULLABLE' },
              { name: 'rating', type: 'INTEGER', mode: 'NULLABLE' },
              { name: 'comment', type: 'STRING', mode: 'NULLABLE' },
              { name: 'feedback_date', type: 'DATE', mode: 'NULLABLE' },
            ],
          },
        ],
      },
      {
        id: 'marketing_analytics',
        name: 'Marketing Analytics',
        tables: [
          {
            id: 'campaign_performance',
            name: 'Campaign Performance',
            description: 'Tracks performance metrics for various marketing campaigns.',
            location: 'US',
            type: 'TABLE',
            schema: [
              { name: 'campaign_id', type: 'STRING', mode: 'REQUIRED' },
              { name: 'campaign_name', type: 'STRING', mode: 'NULLABLE' },
              { name: 'start_date', type: 'DATE', mode: 'NULLABLE' },
              { name: 'end_date', type: 'DATE', mode: 'NULLABLE' },
              { name: 'budget', type: 'FLOAT', mode: 'NULLABLE' },
              { name: 'impressions', type: 'INTEGER', mode: 'NULLABLE' },
              { name: 'clicks', type: 'INTEGER', mode: 'NULLABLE' },
              { name: 'conversions', type: 'INTEGER', mode: 'NULLABLE' },
            ],
          },
        ],
      },
    ],
  },
];
