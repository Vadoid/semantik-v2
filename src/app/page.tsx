
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import QueryEditor from '@/components/bigquery-explorer/query-editor';
import ResultsDashboard from '@/components/bigquery-explorer/results-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Loader2 } from 'lucide-react';
import { runBigQueryQuery } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useBigQueryExplorer } from '@/context/bigquery-explorer-context';

import { Suspense } from 'react';

function BigQueryExplorerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');
  const { selectedTable } = useBigQueryExplorer();

  const [query, setQuery] = useState('');
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedTable) {
      if (!projectId) return;
      const fields = selectedTable.schema.map(field => `  ${field.name}`).join(',\n');
      const newQuery = `SELECT\n${fields}\nFROM \`${selectedTable.id}\`\nLIMIT 100;`;
      setQuery(newQuery);
      setQueryResults([]);
    }
  }, [selectedTable, projectId]);

  const handleRunQuery = async () => {
    if (!query || !projectId) return;

    setIsRunning(true);
    setQueryResults([]);
    try {
      const results = await runBigQueryQuery(query, projectId);
      setQueryResults(results);
    } catch (error: any) {
      console.error('Failed to run query:', error);
      if (error.message.includes('Authentication with Google Cloud failed')) {
        toast({
          variant: 'destructive',
          title: 'Authentication Error',
          description: 'Your session has expired. Please log in again.',
        });
        router.push('/login');
      } else {
        toast({
          variant: 'destructive',
          title: 'Query Failed',
          description: error.message || 'An error occurred while running the BigQuery query.',
        });
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
      <QueryEditor
        query={query}
        setQuery={setQuery}
        onRunQuery={handleRunQuery}
        isRunning={isRunning}
      />
      {isRunning ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 size={20} className="animate-spin" />
              <span>Running Query...</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : queryResults.length > 0 ? (
        <ResultsDashboard results={queryResults} isRunning={isRunning} table={selectedTable!} />
      ) : (
        !isRunning && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database size={20} />
                <span>Awaiting Query</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {selectedTable ? 'Run the query to see results.' : 'Please select a table from the schema browser to begin.'}
              </p>
            </CardContent>
          </Card>
        )
      )}
    </main>
  );
}

export default function BigQueryExplorerPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <BigQueryExplorerContent />
    </Suspense>
  );
}
