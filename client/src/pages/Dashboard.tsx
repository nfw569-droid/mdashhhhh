import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { OverviewCards } from "@/components/OverviewCards";
import { InsightsPanel } from "@/components/InsightsPanel";
import { ChartsSection } from "@/components/ChartsSection";
import { DataExplorer } from "@/components/DataExplorer";
import { Header } from "@/components/Header";
import type { ParsedData } from "@shared/schema";

export default function Dashboard() {
  const [data, setData] = useState<ParsedData | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDataParsed = (parsedData: ParsedData, file: string) => {
    setData(parsedData);
    setFileName(file);
  };

  const handleReset = () => {
    setData(null);
    setFileName("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header fileName={fileName} onReset={handleReset} hasData={!!data} />
      
      <main className="max-w-7xl mx-auto px-6 pb-12">
        {!data ? (
          <div className="pt-24">
            <FileUpload 
              onDataParsed={handleDataParsed}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          </div>
        ) : (
          <div className="pt-24 space-y-12">
            <OverviewCards stats={data.stats} />
            <InsightsPanel insights={data.insights} />
            <ChartsSection 
              dataPoints={data.dataPoints} 
              stats={data.stats}
            />
            <DataExplorer dataPoints={data.dataPoints} />
          </div>
        )}
      </main>
    </div>
  );
}
