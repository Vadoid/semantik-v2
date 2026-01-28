'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Plus } from "lucide-react";
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from "next/navigation";

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

function DashboardContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');

  return (
    <div className="flex w-full flex-col bg-muted/40">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Sales by Region</CardTitle>
              <CardDescription>Bar chart showing total revenue per region for Q4 2023.</CardDescription>
            </CardHeader>
            <CardContent>
              <Image
                src="https://picsum.photos/seed/chart1/600/400"
                alt="Placeholder chart for Sales by Region"
                width={600}
                height={400}
                className="rounded-lg w-full h-auto"
                data-ai-hint="bar chart"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Quarterly Revenue Trend</CardTitle>
              <CardDescription>Line chart illustrating revenue growth over the past year.</CardDescription>
            </CardHeader>
            <CardContent>
              <Image
                src="https://picsum.photos/seed/chart2/600/400"
                alt="Placeholder chart for Quarterly Revenue Trend"
                width={600}
                height={400}
                className="rounded-lg w-full h-auto"
                data-ai-hint="line chart"
              />
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>AI Insights: Q4 Performance</CardTitle>
              <CardDescription>Key takeaways from Q4 sales and customer feedback data.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Asia continues to be the top-performing region, showing a 14% increase in revenue compared to Q3. North America saw the highest growth in units sold (+20%), likely driven by successful holiday campaigns. Europe's performance is stable, but feedback analysis suggests a need to address product feature gaps to improve customer satisfaction and drive future growth.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
