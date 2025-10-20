import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AreaChart, Area } from 'recharts';
import type { DataPoint, PersonStats } from "@shared/schema";
import { PieChart, Pie, Cell } from 'recharts';

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
  const [showExtras, setShowExtras] = useState<boolean>(true);

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

  // Zero-days per person (number of days with count === 0 in the analysis window)
  const zeroDaysData = (() => {
    if (!dataPoints || dataPoints.length === 0) return [{ person: 'J', zeros: 0 }, { person: 'A', zeros: 0 }, { person: 'M', zeros: 0 }];
    const analysisStart = new Date(2023, 6, 10); // 2023-07-10
    const analysisEnd = new Date(); analysisEnd.setHours(23, 59, 59, 999);
    const map: { [iso: string]: DataPoint } = {};
    dataPoints.forEach(d => map[d.date] = d);
    let jZeros = 0, aZeros = 0, mZeros = 0;
    for (let d = new Date(analysisStart); d <= analysisEnd; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().split('T')[0];
      const entry = map[iso] || { date: iso, J: 0, A: 0, M: 0 };
      if ((entry.J || 0) === 0) jZeros++;
      if ((entry.A || 0) === 0) aZeros++;
      if ((entry.M || 0) === 0) mZeros++;
    }
    return [
      { person: 'J', zeros: jZeros },
      { person: 'A', zeros: aZeros },
      { person: 'M', zeros: mZeros },
    ];
  })();

  const chartConfig = {
    style: {
      backgroundColor: 'transparent',
    },
    margin: { top: 5, right: 20, left: 0, bottom: 5 },
  };

  // Day of week aggregation
  const dayOfWeekCounts = (() => {
    const dayNamesShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const days: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    if (dataPoints.length === 0) return dayNamesShort.map(d => ({ day: d, total: 0 }));

    const analysisStart = new Date(2023, 6, 10);
    const analysisEnd = new Date(); analysisEnd.setHours(23, 59, 59, 999);
    const map: { [iso: string]: DataPoint } = {};
    dataPoints.forEach(d => map[d.date] = d);
    for (let d = new Date(analysisStart); d <= analysisEnd; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().split('T')[0];
      const entry = map[iso] || { date: iso, J: 0, A: 0, M: 0 };
      const total = entry.J + entry.A + entry.M;
      const weekday = d.getDay(); // 0=Sun .. 6=Sat
      const monIndex = (weekday + 6) % 7; // convert to 0=Mon .. 6=Sun
      const short = dayNamesShort[monIndex];
      days[short] += total;
    }
    return dayNamesShort.map(d => ({ day: d, total: days[d] }));
  })();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Visualizations</h2>
      <div className="flex items-center justify-end">
        <Button size="sm" variant="ghost" onClick={() => setShowExtras(v => !v)}>
          {showExtras ? 'Hide extra charts' : 'Show more charts'}
        </Button>
      </div>

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

      {/* Day of week */}
      <Card data-testid="chart-weekday">
        <CardHeader>
          <CardTitle>Activity by Day of Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekCounts} {...chartConfig}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '6px', color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="total" fill="hsl(var(--chart-1))" />
              </BarChart>
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

      {/* Zero-days Chart */}
      <Card data-testid="chart-zero-days">
        <CardHeader>
          <CardTitle>Zero-count Days per Person</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zeroDaysData} {...chartConfig}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="person" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '6px', color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="zeros" fill="hsl(var(--chart-4))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {showExtras && (
        <>
          {/* Per-person small multiples */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['J', 'A', 'M'].map((p, idx) => (
              <Card key={p}>
                <CardHeader>
                  <CardTitle>Person {p}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timelineData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <XAxis dataKey="date" hide />
                        <YAxis hide />
                        <Tooltip />
                        <Line type="monotone" dataKey={p} stroke={idx === 0 ? 'hsl(var(--chart-1))' : idx === 1 ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-3))'} dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Correlation matrix (simple) */}
          <Card>
            <CardHeader>
              <CardTitle>Correlation matrix (J, A, M)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-sm text-muted-foreground">
                The correlation matrix shows the Pearson correlation coefficient between each pair of individuals (J, A, M).
                Values range from -1.0 to 1.0: a value near 1.0 means the two series move together (positive correlation),
                near -1.0 means they move oppositely (negative correlation), and near 0 means little linear relationship.
                As a rule of thumb: |r| &gt; 0.7 is strong, 0.3 &lt; |r| &lt; 0.7 is moderate, and |r| &lt; 0.3 is weak.
              </div>
              <div className="mb-4 text-sm">
                <strong>Simple:</strong> If the number is close to 1, the two people tend to have high counts on the same days.
                If it's close to -1, when one has a high count the other tends to have a low count. If it's near 0, there's no clear connection.
                Example: 0.8 = often rise/fall together; -0.8 = often opposite; 0.1 = almost unrelated.
              </div>
              <div className="flex items-center justify-center py-6">
                <div className="grid grid-cols-3 gap-2">
                  {(() => {
                    const cells = [] as JSX.Element[];
                    const labels = ['J', 'A', 'M'];
                    const corrs = [
                      [1, stats.J ? ((stats.J.yearTotal && 0) || 0) : 0, stats.A ? 0 : 0],
                    ];
                    // We'll render simple squares using insights text as we computed correlations in parser
                    // Extract from the insights isn't feasible here; instead compute again quickly
                    const arrJ = dataPoints.map(d => d.J);
                    const arrA = dataPoints.map(d => d.A);
                    const arrM = dataPoints.map(d => d.M);
                    const pearson = (x: number[], y: number[]) => {
                      const n = Math.min(x.length, y.length);
                      if (n === 0) return 0;
                      const mx = x.reduce((s, v) => s + v, 0) / n;
                      const my = y.reduce((s, v) => s + v, 0) / n;
                      let num = 0, denx = 0, deny = 0;
                      for (let i = 0; i < n; i++) {
                        const dx = x[i] - mx;
                        const dy = y[i] - my;
                        num += dx * dy;
                        denx += dx * dx;
                        deny += dy * dy;
                      }
                      const denom = Math.sqrt(denx * deny);
                      if (denom === 0) return 0;
                      return num / denom;
                    };
                    const cJA = pearson(arrJ, arrA);
                    const cJM = pearson(arrJ, arrM);
                    const cAM = pearson(arrA, arrM);
                    const matrix = [
                      [1, cJA, cJM],
                      [cJA, 1, cAM],
                      [cJM, cAM, 1],
                    ];
                    for (let r = 0; r < 3; r++) {
                      for (let c = 0; c < 3; c++) {
                        const val = matrix[r][c];
                        const shade = Math.min(255, Math.round(255 * (1 - Math.abs(val))));
                        const bg = `rgb(${shade}, ${shade}, ${shade})`;
                        cells.push(
                          <div key={`${r}-${c}`} className="w-20 h-12 flex items-center justify-center border" style={{ background: bg }}>
                            <div className="text-xs font-mono">{val.toFixed(2)}</div>
                          </div>
                        );
                      }
                    }
                    return cells;
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Cumulative area chart */}
          <Card>
            <CardHeader>
              <CardTitle>Cumulative Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData} {...chartConfig}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="J" stackId="1" stroke="hsl(var(--chart-1))" fill="rgba(255,255,255,0.03)" />
                    <Area type="monotone" dataKey="A" stackId="1" stroke="hsl(var(--chart-2))" fill="rgba(255,255,255,0.06)" />
                    <Area type="monotone" dataKey="M" stackId="1" stroke="hsl(var(--chart-3))" fill="rgba(255,255,255,0.09)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Day of week chart */}
          <Card>
            <CardHeader>
              <CardTitle>Activity by Day of Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(() => {
                    const days: Record<string, number> = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
                    const analysisStart = new Date(2023, 6, 10);
                    const analysisEnd = new Date(); analysisEnd.setHours(23, 59, 59, 999);
                    const map: Record<string, DataPoint> = {};
                    dataPoints.forEach(d => map[d.date] = d);
                    for (let d = new Date(analysisStart); d <= analysisEnd; d.setDate(d.getDate() + 1)) {
                      const iso = d.toISOString().split('T')[0];
                      const entry = map[iso] || { date: iso, J: 0, A: 0, M: 0 };
                      const dow = new Date(iso).toLocaleDateString('en-US', { weekday: 'short' });
                      days[dow as keyof typeof days] = (days[dow as keyof typeof days] || 0) + entry.J + entry.A + entry.M;
                    }
                    return Object.entries(days).map(([day, total]) => ({ day, total }));
                  })()} {...chartConfig}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(var(--chart-4))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
