import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { ParsedData } from "@shared/schema";

interface FileUploadProps {
  onDataParsed: (data: ParsedData, fileName: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function FileUpload({ onDataParsed, isLoading, setIsLoading }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      setError("Please upload an Excel or CSV file (.xlsx, .xls, .csv)");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      // parse in-browser
      const { parseFile } = await import('@/lib/parseExcel');
      const data: ParsedData = await parseFile(file as File);
      onDataParsed(data, file.name);

      toast({
        title: "File parsed successfully",
        description: `Analyzed ${data.dataPoints.length} data points from ${file.name}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
      toast({
        variant: "destructive",
        title: "Parsing failed",
        description: "Please check your file format and try again",
      });
    } finally {
      setIsLoading(false);
    }
  }, [onDataParsed, setIsLoading, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold tracking-tight mb-4">
          Upload Your Data
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Upload your Excel file to generate comprehensive behavioral insights,
          weekly trends, and pattern analysis for all individuals
        </p>
      </div>

      <Card
        className={`w-full max-w-2xl transition-all duration-200 ${isDragging
          ? 'border-primary bg-primary/5'
          : 'border-dashed border-2'
          } ${isLoading ? 'opacity-50 pointer-events-none' : 'hover-elevate cursor-pointer'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-testid="dropzone-upload"
      >
        <label className="block p-12 cursor-pointer">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInput}
            className="hidden"
            disabled={isLoading}
            data-testid="input-file"
          />

          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <Upload className="h-16 w-16 text-primary relative z-10" />
            </div>

            <div className="text-center space-y-2">
              <p className="text-xl font-medium">
                {isLoading ? 'Parsing your file...' : 'Drop your Excel file here'}
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse
              </p>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-md">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Supports .xlsx and .xls files
              </span>
            </div>
          </div>
        </label>
      </Card>

      {error && (
        <div className="mt-6 flex items-center gap-2 text-destructive" data-testid="text-error">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
        <div className="text-center p-6">
          <div className="text-2xl font-bold text-primary mb-2">📊</div>
          <h3 className="font-medium mb-1">Deep Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Weekly, monthly, and yearly insights
          </p>
        </div>
        <div className="text-center p-6">
          <div className="text-2xl font-bold text-chart-2 mb-2">🔥</div>
          <h3 className="font-medium mb-1">Pattern Detection</h3>
          <p className="text-sm text-muted-foreground">
            Streaks, peaks, and behavioral trends
          </p>
        </div>
        <div className="text-center p-6">
          <div className="text-2xl font-bold text-chart-3 mb-2">📈</div>
          <h3 className="font-medium mb-1">Rich Visualizations</h3>
          <p className="text-sm text-muted-foreground">
            Interactive charts and comparisons
          </p>
        </div>
      </div>
    </div>
  );
}
