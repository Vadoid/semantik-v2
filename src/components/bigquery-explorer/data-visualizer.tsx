'use client';

import { useState, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FileDown, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type DataVisualizerProps = {
  data: any[];
};

const CHART_TYPES = ['bar', 'line', 'pie'];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function DataVisualizer({ data }: DataVisualizerProps) {
  const [chartType, setChartType] = useState('bar');
  const [xAxisKey, setXAxisKey] = useState<string | null>(null);
  const [yAxisKey, setYAxisKey] = useState<string | null>(null);
  const { toast } = useToast();

  const numericKeys = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]).filter(key => typeof data[0][key] === 'number');
  }, [data]);

  const categoryKeys = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]).filter(key => typeof data[0][key] === 'string');
  }, [data]);

  const renderChart = () => {
    if (!xAxisKey || !yAxisKey) {
      return <p className="text-muted-foreground text-center py-12">Please select X and Y axis to generate a chart.</p>;
    }

    const chartProps = {
      data: data,
      margin: { top: 20, right: 30, left: 20, bottom: 5 },
    };

    let ChartComponent;

    if (chartType === 'bar') {
      ChartComponent = (
        <BarChart {...chartProps}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxisKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={yAxisKey} fill="hsl(var(--primary))" />
        </BarChart>
      );
    } else if (chartType === 'line') {
      ChartComponent = (
        <LineChart {...chartProps}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxisKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={yAxisKey} stroke="hsl(var(--primary))" activeDot={{ r: 8 }} />
        </LineChart>
      );
    } else {
      ChartComponent = (
        <PieChart>
          <Pie data={data} dataKey={yAxisKey} nameKey={xAxisKey} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={350}>
        {ChartComponent}
      </ResponsiveContainer>
    );
  };

  const handleAddToDashboard = () => {
    toast({
      title: "Added to Dashboard",
      description: `The ${chartType} chart has been added to your dashboard.`,
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Data Visualization</CardTitle>
            <CardDescription>Generate charts from your query results.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleAddToDashboard}><PlusCircle className="mr-2 h-4 w-4" /> Add to Dashboard</Button>
            <Button variant="outline" size="sm"><FileDown className="mr-2 h-4 w-4" /> Export</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-secondary/50 rounded-lg">
          <div>
            <label className="text-sm font-medium mb-2 block">Chart Type</label>
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHART_TYPES.map(type => (
                  <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">{chartType === 'pie' ? 'Label' : 'X-Axis'} (Categorical)</label>
            <Select onValueChange={setXAxisKey}>
              <SelectTrigger><SelectValue placeholder="Select a column" /></SelectTrigger>
              <SelectContent>
                {categoryKeys.map(key => (
                  <SelectItem key={key} value={key}>{key}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">{chartType === 'pie' ? 'Value' : 'Y-Axis'} (Numeric)</label>
            <Select onValueChange={setYAxisKey}>
              <SelectTrigger><SelectValue placeholder="Select a column" /></SelectTrigger>
              <SelectContent>
                {numericKeys.map(key => (
                  <SelectItem key={key} value={key}>{key}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="h-[350px]">
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
}
