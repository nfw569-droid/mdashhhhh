import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { PersonStats } from "@shared/schema";

interface OverviewCardsProps {
  stats: {
    J: PersonStats;
    A: PersonStats;
    M: PersonStats;
  };
}

const personColors = {
  J: {
    border: "border-t-chart-1",
    bg: "bg-chart-1/10",
    text: "text-chart-1",
  },
  A: {
    border: "border-t-chart-2",
    bg: "bg-chart-2/10",
    text: "text-chart-2",
  },
  M: {
    border: "border-t-chart-3",
    bg: "bg-chart-3/10",
    text: "text-chart-3",
  },
};

function PersonCard({ stats }: { stats: PersonStats }) {
  const colors = personColors[stats.person];

  return (
    <Card className={`border-t-4 ${colors.border}`} data-testid={`card-person-${stats.person}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className={`text-5xl font-bold ${colors.text}`}>
            {stats.person}
          </div>
          <div className={`px-3 py-1 rounded-md ${colors.bg} ${colors.text} text-sm font-medium`}>
            {stats.totalDays} days
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">This Week</div>
            <div className="text-2xl font-mono font-semibold" data-testid={`text-week-${stats.person}`}>
              {stats.currentWeek}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">This Month</div>
            <div className="text-2xl font-mono font-semibold" data-testid={`text-month-${stats.person}`}>
              {stats.currentMonth}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Year Total</div>
            <div className="text-2xl font-mono font-semibold" data-testid={`text-year-${stats.person}`}>
              {stats.yearTotal}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Weekly Avg</div>
            <div className="text-lg font-mono font-medium">
              {stats.weeklyAvg.toFixed(1)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Monthly Avg</div>
            <div className="text-lg font-mono font-medium">
              {stats.monthlyAvg.toFixed(1)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Peak Day</div>
            <div className="text-lg font-mono font-medium">
              {new Date(stats.peakDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              <span className="text-sm ml-1">({stats.peakDayCount})</span>
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Best Streak</div>
            <div className="text-lg font-mono font-medium">
              {stats.longestStreak} days
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function OverviewCards({ stats }: OverviewCardsProps) {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PersonCard stats={stats.J} />
        <PersonCard stats={stats.A} />
        <PersonCard stats={stats.M} />
      </div>
    </div>
  );
}
