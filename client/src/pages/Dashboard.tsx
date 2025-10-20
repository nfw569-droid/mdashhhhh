import { useEffect, useState } from "react";
import { OverviewCards } from "@/components/OverviewCards";
import { InsightsPanel } from "@/components/InsightsPanel";
import { ChartsSection } from "@/components/ChartsSection";
import { DataExplorer } from "@/components/DataExplorer";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import type { ParsedData } from "@shared/schema";
import { FileUpload } from "@/components/FileUpload";
import { fetchAndParseGoogleSheet } from "@/lib/parseExcel";

export default function Dashboard() {
  const [data, setData] = useState<ParsedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    // Fetch and parse Google Sheet directly
    const loadData = async () => {
      try {
        setIsLoading(true);
        const parsed = await fetchAndParseGoogleSheet();
        setData(parsed);
        setLastRefresh(new Date());
        setError(null);
      } catch (e) {
        console.error('Failed to fetch data:', e);
        setError(e instanceof Error ? e : new Error('Failed to fetch Google Sheet'));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Refresh every 12 hours
    const interval = setInterval(loadData, 12 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDataParsed = (parsed: ParsedData, fileName: string) => {
    setData(parsed);
    setError(null);
  };

  const handleReset = () => {
    setData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        fileName={data ? '23-24data.xlsx' : ''}
        onReset={handleReset}
        hasData={!!data}
        lastRefresh={lastRefresh}
      />

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
        ) : (
          // No data: show upload UI
          <div className="pt-24">
            <FileUpload onDataParsed={handleDataParsed} isLoading={isLoading} setIsLoading={setIsLoading} />
          </div>
        )}
      </main>
    </div>
  );
}
