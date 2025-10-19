import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown } from "lucide-react";
import type { DataPoint } from "@shared/schema";

interface DataExplorerProps {
  dataPoints: DataPoint[];
}

type SortField = "date" | "J" | "A" | "M";
type SortOrder = "asc" | "desc";

export function DataExplorer({ dataPoints }: DataExplorerProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let filtered = dataPoints;
    
    if (search) {
      filtered = dataPoints.filter(d => 
        d.date.includes(search) ||
        d.J.toString().includes(search) ||
        d.A.toString().includes(search) ||
        d.M.toString().includes(search)
      );
    }

    return [...filtered].sort((a, b) => {
      let aVal: string | number = a[sortField];
      let bVal: string | number = b[sortField];
      
      if (sortField === "date") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      
      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [dataPoints, search, sortField, sortOrder]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Data Explorer</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th 
                  className="text-left py-3 px-4 font-medium cursor-pointer hover-elevate"
                  onClick={() => handleSort("date")}
                  data-testid="header-date"
                >
                  <div className="flex items-center gap-2">
                    Date
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 font-medium cursor-pointer hover-elevate font-mono"
                  onClick={() => handleSort("J")}
                  data-testid="header-j"
                >
                  <div className="flex items-center justify-center gap-2">
                    J
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 font-medium cursor-pointer hover-elevate font-mono"
                  onClick={() => handleSort("A")}
                  data-testid="header-a"
                >
                  <div className="flex items-center justify-center gap-2">
                    A
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 font-medium cursor-pointer hover-elevate font-mono"
                  onClick={() => handleSort("M")}
                  data-testid="header-m"
                >
                  <div className="flex items-center justify-center gap-2">
                    M
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th className="text-center py-3 px-4 font-medium font-mono">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedData.map((point, index) => (
                <tr 
                  key={index} 
                  className={`border-b border-border/50 hover-elevate ${
                    index % 2 === 0 ? 'bg-muted/20' : ''
                  }`}
                  data-testid={`row-data-${index}`}
                >
                  <td className="py-3 px-4">
                    {new Date(point.date).toLocaleDateString('en-US', { 
                      year: 'numeric',
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-chart-1">
                    {point.J}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-chart-2">
                    {point.A}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-chart-3">
                    {point.M}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-semibold">
                    {point.J + point.A + point.M}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredAndSortedData.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No data found
          </div>
        )}
      </CardContent>
    </Card>
  );
}
