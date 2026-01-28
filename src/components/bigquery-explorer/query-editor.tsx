
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Play, Sparkles, Loader2, Info, Table2, CheckCircle, ShieldQuestion } from 'lucide-react';
import { Editor } from '@monaco-editor/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { improveSqlQuery, ImproveSqlQueryOutput } from '@/ai/flows/improve-sql-query';
import { dryRunBigQueryQuery } from '@/app/actions';
import type { Table } from '@/lib/bigquery-mock';
import { cn } from '@/lib/utils';
import { useBigQueryExplorer } from '@/context/bigquery-explorer-context';

type QueryEditorProps = {
  query: string;
  setQuery: (query: string) => void;
  onRunQuery: () => void;
  isRunning: boolean;
};

export default function QueryEditor({ query, setQuery, onRunQuery, isRunning }: QueryEditorProps) {
  const [isImproving, setIsImproving] = useState(false);
  const [isDoingDryRun, setIsDoingDryRun] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<string | null>(null);
  const [improvement, setImprovement] = useState<ImproveSqlQueryOutput | null>(null);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');
  const { selectedTable, setSelectedTable } = useBigQueryExplorer();

  function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  useEffect(() => {
    const handleDryRun = async () => {
      if (!query || !projectId) {
        setDryRunResult(null);
        return;
      }
      setIsDoingDryRun(true);
      setDryRunResult('Analyzing query...');
      try {
        const stats = await dryRunBigQueryQuery(query, projectId);
        if (stats.cacheHit) {
          setDryRunResult('This query will be served from cache and will not incur a charge.');
        } else {
          const bytes = stats.totalBytesBilled ? parseInt(stats.totalBytesBilled, 10) : (stats.totalBytesProcessed ? parseInt(stats.totalBytesProcessed, 10) : 0);
          setDryRunResult(`This query will process ${formatBytes(bytes)}.`);
        }
      } catch (error: any) {
        console.error('Failed to perform dry run:', error);
        setDryRunResult(`Dry run failed: ${error.message.split('Reason: ')[1]?.split(' [')[0] || 'Check query syntax.'}`);
      } finally {
        setIsDoingDryRun(false);
      }
    };

    // Debounce the dry run
    const debounceTimeout = setTimeout(() => {
      handleDryRun();
    }, 500); // 500ms delay

    return () => clearTimeout(debounceTimeout);
  }, [query, projectId]);

  const handleImproveQuery = async () => {
    if (!selectedTable) {
      toast({
        variant: 'destructive',
        title: 'No table selected',
        description: 'Please select a table to improve its query.',
      });
      return;
    }
    setIsImproving(true);
    setImprovement(null);
    try {
      const result = await improveSqlQuery({
        sqlQuery: query,
        tableSchemaDescription: selectedTable.description,
      });
      setImprovement(result);
    } catch (error) {
      console.error('Failed to improve query:', error);
      toast({
        variant: 'destructive',
        title: 'AI Improvement Failed',
        description: 'An error occurred while trying to improve the query.',
      });
    } finally {
      setIsImproving(false);
    }
  };

  const useImprovedQuery = () => {
    if (improvement) {
      setQuery(improvement.improvedSqlQuery);
      setImprovement(null);
      toast({
        title: "Query Updated",
        description: "The improved SQL query has been applied to the editor."
      });
    }
  };

  const handleQueryChange = (newQuery: string | undefined) => {
    setQuery(newQuery || '');
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const tableData = event.dataTransfer.getData('application/json');
    if (tableData && projectId) {
      try {
        const table: Table = JSON.parse(tableData);
        setSelectedTable(table);
        toast({
          title: "Query Updated",
          description: `Querying table ${table.name}. Run query to see results.`
        })
      } catch (error) {
        console.error("Failed to parse dropped data", error);
      }
    }
  };


  return (
    <>
      <Card onDragOver={handleDragOver} onDrop={handleDrop}>
        <CardHeader>
          <CardTitle>Query Editor</CardTitle>
          {selectedTable && (
            <CardDescription className="flex items-center gap-2 pt-1">
              <Table2 className="h-4 w-4" />
              <span>Querying table: <span className="font-semibold text-foreground">{selectedTable.name}</span></span>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative border rounded-md h-64 w-full">
                {!query && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <p className="text-muted-foreground">
                      Select a table, drag one here, or start typing a query.
                    </p>
                  </div>
                )}
                <Editor
                  height="100%"
                  language="sql"
                  theme="vs-light"
                  value={query}
                  onChange={handleQueryChange}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    contextmenu: true,
                    readOnly: isRunning,
                  }}
                />
              </div>
              <div className="flex flex-col items-start">
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <Button onClick={onRunQuery} disabled={!query || isRunning || isImproving || isDoingDryRun}>
                    {isRunning ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Run Query
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleImproveQuery}
                    disabled={!query || !selectedTable || isRunning || isImproving || isDoingDryRun}
                  >
                    {isImproving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4 text-accent" />
                    )}
                    Improve with AI
                  </Button>
                </div>
                {dryRunResult && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    {isDoingDryRun ? <Loader2 className="h-4 w-4 animate-spin" /> : dryRunResult.startsWith('Dry run failed') ? <ShieldQuestion className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                    <span className={cn('italic', dryRunResult.startsWith('Dry run failed') && 'text-destructive')}>{dryRunResult}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="md:col-span-1">
              <Card className="h-full">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Schema
                  </CardTitle>
                  <CardDescription>
                    {selectedTable ? `Columns for ${selectedTable.name}` : 'Select a table to see its schema.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <ScrollArea className="h-48">
                    {selectedTable ? (
                      <ul className="space-y-2">
                        {selectedTable.schema.map((col) => (
                          <li key={col.name} className="flex justify-between items-center text-sm">
                            <span className="font-medium text-foreground">{col.name}</span>
                            <span className="text-muted-foreground font-mono text-xs">{col.type}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No table selected.</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!improvement} onOpenChange={(open) => !open && setImprovement(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>AI Query Improvement</DialogTitle>
            <DialogDescription>
              The AI has suggested improvements for your query to enhance cost-efficiency and comprehensiveness.
            </DialogDescription>
          </DialogHeader>
          {improvement && (
            <div className="grid gap-4 py-4">
              <div>
                <h3 className="font-semibold mb-2">Explanation</h3>
                <p className="text-sm text-muted-foreground bg-secondary p-3 rounded-md">{improvement.explanation}</p>
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Improved SQL Query</h3>
                <pre className="p-3 bg-secondary rounded-md overflow-x-auto">
                  <code className="font-code text-sm">{improvement.improvedSqlQuery}</code>
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImprovement(null)}>Close</Button>
            <Button onClick={useImprovedQuery}>Use this Query</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
