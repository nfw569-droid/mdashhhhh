import { TrendingUp, Calendar, Flame, Users, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Insight } from "@shared/schema";

interface InsightsPanelProps {
  insights: Insight[];
}

const iconMap = {
  peak: TrendingUp,
  streak: Flame,
  comparison: Users,
  pattern: Calendar,
  anomaly: AlertTriangle,
};

const colorMap = {
  peak: "text-chart-5 bg-chart-5/10",
  streak: "text-chart-4 bg-chart-4/10",
  comparison: "text-chart-2 bg-chart-2/10",
  pattern: "text-primary bg-primary/10",
  anomaly: "text-destructive bg-destructive/10",
};

function InsightCard({ insight }: { insight: Insight }) {
  const Icon = iconMap[insight.type];
  const colorClass = colorMap[insight.type];

  return (
    <Card className="min-w-[300px] hover-elevate" data-testid={`insight-${insight.type}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${colorClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium mb-1">{insight.title}</h3>
            <p className="text-sm text-muted-foreground mb-2">
              {insight.description}
            </p>
            {insight.metric && (
              <div className="text-lg font-mono font-semibold">
                {insight.metric}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Key Insights</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide">
        {insights.map((insight, index) => (
          <InsightCard key={index} insight={insight} />
        ))}
      </div>
    </div>
  );
}
