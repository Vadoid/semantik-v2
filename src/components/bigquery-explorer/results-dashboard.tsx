'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import ResultsTable from './results-table';
import DataVisualizer from './data-visualizer';
import InsightsPanel from './insights-panel';
import type { Table } from '@/lib/bigquery-mock';

type ResultsDashboardProps = {
  results: any[];
  isRunning: boolean;
  table: Table;
};

export default function ResultsDashboard({ results, isRunning, table }: ResultsDashboardProps) {
  if (isRunning) {
    return (
      <div className="space-y-4 mt-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="results" className="w-full mt-4">
      <TabsList>
        <TabsTrigger value="results">Results</TabsTrigger>
        <TabsTrigger value="visualization">Visualization</TabsTrigger>
        <TabsTrigger value="insights">AI Insights</TabsTrigger>
      </TabsList>
      <TabsContent value="results">
        <ResultsTable data={results} />
      </TabsContent>
      <TabsContent value="visualization">
        <DataVisualizer data={results} />
      </TabsContent>
      <TabsContent value="insights">
        <InsightsPanel queryResults={JSON.stringify(results, null, 2)} table={table} />
      </TabsContent>
    </Tabs>
  );
}
