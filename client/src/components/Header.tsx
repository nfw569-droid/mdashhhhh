import { Upload, Sun, Moon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useRefreshStatus } from "@/hooks/use-refresh-status";

interface HeaderProps {
  fileName: string;
  onReset: () => void;
  hasData: boolean;
  lastRefresh?: Date;
}

export function Header({ fileName, onReset, hasData, lastRefresh }: HeaderProps) {
  const { status } = useRefreshStatus();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    } catch { return 'light'; }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try { localStorage.setItem('theme', theme); } catch { }
  }, [theme]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold tracking-tight">
              Muth Analysis Dashboard
            </h1>
            <div className="flex flex-col">
              {fileName && (
                <span className="text-sm text-muted-foreground">
                  {fileName}
                </span>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                {lastRefresh ? `Last updated: ${lastRefresh.toLocaleString()}` : 'Loading...'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {hasData && (
              <Button
                onClick={onReset}
                variant="outline"
                size="sm"
                data-testid="button-upload-new"
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload New File
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
