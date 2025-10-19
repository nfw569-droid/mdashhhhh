import { useQuery } from "@tanstack/react-query";
import { OverviewCards } from "@/components/OverviewCards";
import { InsightsPanel } from "@/components/InsightsPanel";
import { ChartsSection } from "@/components/ChartsSection";
import { DataExplorer } from "@/components/DataExplorer";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import type { ParsedData } from "@shared/schema";

export default function Dashboard() {
  const { data, isLoading, error } = useQuery<ParsedData>({
    queryKey: ["/api/data"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Header fileName="23-24data.xlsx" onReset={() => {}} hasData={!!data} />
      
      <main className="max-w-7xl mx-auto px-6 pb-12">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-md">
              <CardContent className="p-12 flex flex-col items-center gap-6">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold">Analyzing Your Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Parsing Excel sheets and computing insights...
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-md border-destructive">
              <CardContent className="p-12 flex flex-col items-center gap-6">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold">Error Loading Data</h3>
                  <p className="text-sm text-muted-foreground">
                    {error instanceof Error ? error.message : "Failed to load data"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : data ? (
          <div className="pt-24 space-y-12">
            <OverviewCards stats={data.stats} />
            <InsightsPanel insights={data.insights} />
            <ChartsSection 
              dataPoints={data.dataPoints} 
              stats={data.stats}
            />
            <DataExplorer dataPoints={data.dataPoints} />
          </div>
        ) : null}
      </main>
    </div>
  );
}
