'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateDataInsights } from '@/ai/flows/generate-data-insights';
import { Lightbulb, Loader2, PlusCircle } from 'lucide-react';
import type { Table } from '@/lib/bigquery-mock';

type InsightsPanelProps = {
  queryResults: string;
  table: Table;
};

export default function InsightsPanel({ queryResults, table }: InsightsPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerateInsights = async () => {
    setIsLoading(true);
    setInsights(null);
    try {
      const result = await generateDataInsights({ queryResults });
      setInsights(result.insights);
    } catch (error) {
      console.error('Failed to generate insights:', error);
      toast({
        variant: 'destructive',
        title: 'AI Insight Generation Failed',
        description: 'An error occurred while trying to generate insights.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToDashboard = () => {
    toast({
      title: "Added to Dashboard",
      description: `The AI insights for ${table.name} have been added to your dashboard.`,
    })
  }

  return (
    <Card>
      <CardHeader>
         <div className="flex justify-between items-start">
            <div>
                <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="text-primary" />
                    AI-Powered Insights
                </CardTitle>
                <CardDescription>Discover key trends and patterns in your data.</CardDescription>
            </div>
            {insights && (
                 <Button variant="outline" size="sm" onClick={handleAddToDashboard}><PlusCircle className="mr-2 h-4 w-4"/> Add to Dashboard</Button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        {insights ? (
          <div className="text-sm text-muted-foreground whitespace-pre-line space-y-4 max-w-full">
            <p>{insights}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
            {isLoading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">The AI is analyzing your data... this may take a moment.</p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-4">Click the button to let our AI analyze the query results and provide you with actionable insights.</p>
                <Button onClick={handleGenerateInsights} disabled={isLoading}>
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Generate Insights
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
