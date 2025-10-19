import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { DataPoint, PersonStats } from "@shared/schema";

interface ChartsSectionProps {
  dataPoints: DataPoint[];
  stats: {
    J: PersonStats;
    A: PersonStats;
    M: PersonStats;
  };
}

type Period = "week" | "month" | "year";

export function ChartsSection({ dataPoints, stats }: ChartsSectionProps) {
  const [timelinePeriod, setTimelinePeriod] = useState<Period>("month");

  // Filter data based on selected period
  const getFilteredData = (period: Period) => {
    const now = new Date();
    const cutoff = new Date();
    
    switch (period) {
      case "week":
        cutoff.setDate(now.getDate() - 7);
        break;
      case "month":
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case "year":
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return dataPoints.filter(d => new Date(d.date) >= cutoff);
  };

  const filteredData = getFilteredData(timelinePeriod);
  
  // Prepare timeline data with formatted dates
  const timelineData = filteredData.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    J: d.J,
    A: d.A,
    M: d.M,
  }));

  // Comparison data
  const comparisonData = [
    {
      metric: "Weekly Avg",
      J: stats.J.weeklyAvg,
      A: stats.A.weeklyAvg,
      M: stats.M.weeklyAvg,
    },
    {
      metric: "Monthly Avg",
      J: stats.J.monthlyAvg,
      A: stats.A.monthlyAvg,
      M: stats.M.monthlyAvg,
    },
    {
      metric: "Year Total",
      J: stats.J.yearTotal,
      A: stats.A.yearTotal,
      M: stats.M.yearTotal,
    },
  ];

  const chartConfig = {
    style: {
      backgroundColor: 'transparent',
    },
    margin: { top: 5, right: 20, left: 0, bottom: 5 },
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Visualizations</h2>

      {/* Timeline Chart */}
      <Card data-testid="chart-timeline">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Timeline Trends</CardTitle>
            <Tabs value={timelinePeriod} onValueChange={(v) => setTimelinePeriod(v as Period)}>
              <TabsList>
                <TabsTrigger value="week" data-testid="tab-week">Week</TabsTrigger>
                <TabsTrigger value="month" data-testid="tab-month">Month</TabsTrigger>
                <TabsTrigger value="year" data-testid="tab-year">Year</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} {...chartConfig}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="J" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-1))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="A" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-2))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="M" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-3))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Chart */}
      <Card data-testid="chart-comparison">
        <CardHeader>
          <CardTitle>Comparison Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} {...chartConfig}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="metric" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Legend />
                <Bar dataKey="J" fill="hsl(var(--chart-1))" />
                <Bar dataKey="A" fill="hsl(var(--chart-2))" />
                <Bar dataKey="M" fill="hsl(var(--chart-3))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
