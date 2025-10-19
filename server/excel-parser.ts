import XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import type { DataPoint, ParsedData, PersonStats, Insight } from "@shared/schema";

export async function parseExcelFile(): Promise<ParsedData> {
  const filePath = path.join(process.cwd(), 'attached_assets', '23-24data_1760901829734.xlsx');
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel file not found at ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  
  console.log('Available sheets:', workbook.SheetNames);
  
  // Parse history sheet (main data source with sequential dates)
  const historyData = parseHistorySheet(workbook);
  console.log(`Parsed ${historyData.length} points from history sheet`);
  
  // Parse backup sheet (has 2023, 2024, 2025 data in columns)
  const backupData = parseBackupSheet(workbook);
  console.log(`Parsed ${backupData.length} points from backup sheet`);
  
  // Merge and sort data points
  const allData = [...historyData, ...backupData].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Remove duplicates (in case there's overlap)
  const uniqueData = Array.from(
    new Map(allData.map(item => [item.date, item])).values()
  );
  
  // Filter out future dates (dates after today)
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  const validData = uniqueData.filter(d => new Date(d.date) <= today);
  
  console.log(`Total unique data points: ${validData.length} (filtered ${uniqueData.length - validData.length} future dates)`);
  
  // Compute statistics
  const stats = computeStatistics(validData);
  
  // Generate insights
  const insights = generateInsights(validData, stats);
  
  const dateRange = {
    start: validData[0].date,
    end: validData[validData.length - 1].date,
  };
  
  return {
    dataPoints: validData,
    stats,
    insights,
    dateRange,
  };
}

function parseHistorySheet(workbook: XLSX.WorkBook): DataPoint[] {
  const sheet = workbook.Sheets['history'];
  if (!sheet) {
    console.warn('Sheet "history" not found');
    return [];
  }
  
  const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const dataPoints: DataPoint[] = [];
  let lastValidDate: Date | null = null;
  
  // Find header row (should be row 1)
  // Header: ["Date","MM","Week","Day","J","A","M"]
  const headerRow = data[1];
  if (!headerRow) {
    console.warn('No header row found in history sheet');
    return [];
  }
  
  const dateCol = headerRow.indexOf('Date');
  const jCol = headerRow.indexOf('J');
  const aCol = headerRow.indexOf('A');
  const mCol = headerRow.indexOf('M');
  
  if (dateCol === -1 || jCol === -1 || aCol === -1 || mCol === -1) {
    console.warn('Could not find required columns in history sheet');
    return [];
  }
  
  console.log(`History sheet columns - Date:${dateCol}, J:${jCol}, A:${aCol}, M:${mCol}`);
  
  // Parse data rows (starting from row 2)
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row) || row.length === 0) continue;
    
    let dateValue = row[dateCol];
    let parsedDate: Date | null = null;
    
    // Handle ### date errors or missing dates
    if (!dateValue || String(dateValue).includes('#')) {
      if (lastValidDate) {
        parsedDate = new Date(lastValidDate);
        parsedDate.setDate(parsedDate.getDate() + 1);
      } else {
        continue;
      }
    } else {
      // Parse Excel serial date
      if (typeof dateValue === 'number') {
        const excelDate = XLSX.SSF.parse_date_code(dateValue);
        parsedDate = new Date(Date.UTC(excelDate.y, excelDate.m - 1, excelDate.d));
      } else if (typeof dateValue === 'string') {
        parsedDate = new Date(dateValue);
      } else if (dateValue instanceof Date) {
        parsedDate = dateValue;
      }
      
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        continue;
      }
    }
    
    lastValidDate = parsedDate;
    
    const jValue = Number(row[jCol]) || 0;
    const aValue = Number(row[aCol]) || 0;
    const mValue = Number(row[mCol]) || 0;
    
    dataPoints.push({
      date: parsedDate.toISOString().split('T')[0],
      J: jValue,
      A: aValue,
      M: mValue,
    });
  }
  
  return dataPoints;
}

function parseBackupSheet(workbook: XLSX.WorkBook): DataPoint[] {
  const sheet = workbook.Sheets['backup'];
  if (!sheet) {
    console.warn('Sheet "backup" not found');
    return [];
  }
  
  const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const dataPoints: DataPoint[] = [];
  
  // Row 0: [2023, null, null, null, 2024, null, null, null, 2025]
  // Row 1: ["Date","J","A","M","Date","J","A","M","Date","J","A","M"]
  // Data starts at row 3
  
  if (data.length < 2) return [];
  
  const headerRow = data[1];
  
  // Find all "Date" column indices
  const dateColumns: number[] = [];
  for (let i = 0; i < headerRow.length; i++) {
    if (headerRow[i] === 'Date') {
      dateColumns.push(i);
    }
  }
  
  console.log(`Backup sheet has ${dateColumns.length} date columns at indices:`, dateColumns);
  
  // Parse each year's data
  dateColumns.forEach(dateCol => {
    let lastValidDate: Date | null = null;
    
    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      if (!Array.isArray(row) || row.length === 0) continue;
      
      const dateValue = row[dateCol];
      if (!dateValue) continue;
      
      let parsedDate: Date | null = null;
      
      // Handle ### date errors
      if (String(dateValue).includes('#')) {
        if (lastValidDate) {
          parsedDate = new Date(lastValidDate);
          parsedDate.setDate(parsedDate.getDate() + 1);
        } else {
          continue;
        }
      } else {
        if (typeof dateValue === 'number') {
          const excelDate = XLSX.SSF.parse_date_code(dateValue);
          parsedDate = new Date(Date.UTC(excelDate.y, excelDate.m - 1, excelDate.d));
        } else if (typeof dateValue === 'string') {
          parsedDate = new Date(dateValue);
        }
        
        if (!parsedDate || isNaN(parsedDate.getTime())) {
          continue;
        }
      }
      
      lastValidDate = parsedDate;
      
      const jValue = Number(row[dateCol + 1]) || 0;
      const aValue = Number(row[dateCol + 2]) || 0;
      const mValue = Number(row[dateCol + 3]) || 0;
      
      dataPoints.push({
        date: parsedDate.toISOString().split('T')[0],
        J: jValue,
        A: aValue,
        M: mValue,
      });
    }
  });
  
  return dataPoints;
}

function computeStatistics(dataPoints: DataPoint[]): {
  J: PersonStats;
  A: PersonStats;
  M: PersonStats;
} {
  const persons: ('J' | 'A' | 'M')[] = ['J', 'A', 'M'];
  const stats: any = {};
  
  const now = new Date();
  
  // Get current month boundaries (Oct 1 - Oct 31, 2025)
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
  // Get current week boundaries (last 7 days including today)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  
  // Get year boundaries
  const yearStart = new Date(now.getFullYear(), 0, 1);
  
  console.log('Current month range:', currentMonthStart.toISOString().split('T')[0], 'to', currentMonthEnd.toISOString().split('T')[0]);
  console.log('Current week range:', weekStart.toISOString().split('T')[0], 'to', now.toISOString().split('T')[0]);
  console.log('Current year start:', yearStart.toISOString().split('T')[0]);
  
  persons.forEach(person => {
    const personData = dataPoints.map(d => ({ date: d.date, count: d[person] }));
    
    // Current week (last 7 days)
    const currentWeek = personData
      .filter(d => {
        const date = new Date(d.date);
        return date >= weekStart && date <= now;
      })
      .reduce((sum, d) => sum + d.count, 0);
    
    // Current month (Oct 1 - Oct 31 or today, whichever is earlier)
    const currentMonth = personData
      .filter(d => {
        const date = new Date(d.date);
        return date >= currentMonthStart && date <= currentMonthEnd;
      })
      .reduce((sum, d) => sum + d.count, 0);
    
    // Year total (Jan 1 - today of current year)
    const yearTotal = personData
      .filter(d => {
        const date = new Date(d.date);
        return date >= yearStart && date <= now;
      })
      .reduce((sum, d) => sum + d.count, 0);
    
    // Weekly average (based on all data)
    const weeksCount = Math.max(1, Math.floor(dataPoints.length / 7));
    const weeklyAvg = personData.reduce((sum, d) => sum + d.count, 0) / weeksCount;
    
    // Monthly average (based on all data)
    const monthsCount = Math.max(1, Math.floor(dataPoints.length / 30));
    const monthlyAvg = personData.reduce((sum, d) => sum + d.count, 0) / monthsCount;
    
    // Peak day
    const peakDay = personData.reduce((max, d) => d.count > max.count ? d : max, { date: '', count: 0 });
    
    // Longest streak (consecutive days with count > 0)
    let longestStreak = 0;
    let currentStreak = 0;
    personData.forEach(d => {
      if (d.count > 0) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });
    
    // Quietest period (7-day window with lowest total)
    let quietestPeriod = '';
    let minWeeklyTotal = Infinity;
    for (let i = 0; i <= personData.length - 7; i++) {
      const weekTotal = personData.slice(i, i + 7).reduce((sum, d) => sum + d.count, 0);
      if (weekTotal < minWeeklyTotal) {
        minWeeklyTotal = weekTotal;
        quietestPeriod = personData[i].date;
      }
    }
    
    stats[person] = {
      person,
      currentWeek,
      currentMonth,
      yearTotal,
      weeklyAvg,
      monthlyAvg,
      peakDay: peakDay.date || dataPoints[0].date,
      peakDayCount: peakDay.count,
      longestStreak,
      quietestPeriod: quietestPeriod || dataPoints[0].date,
      totalDays: personData.filter(d => d.count > 0).length,
    };
  });
  
  return stats;
}

function generateInsights(dataPoints: DataPoint[], stats: {
  J: PersonStats;
  A: PersonStats;
  M: PersonStats;
}): Insight[] {
  const insights: Insight[] = [];
  
  // Find overall leader
  const totals = {
    J: stats.J.yearTotal,
    A: stats.A.yearTotal,
    M: stats.M.yearTotal,
  };
  const leader = Object.entries(totals).reduce((max, [person, total]) => 
    total > max.total ? { person: person as 'J' | 'A' | 'M', total } : max,
    { person: 'J' as 'J' | 'A' | 'M', total: 0 }
  );
  
  insights.push({
    type: 'comparison',
    title: `${leader.person} is the most active overall`,
    description: `With a total of ${leader.total} across the entire period`,
    metric: `${leader.total} total`,
    person: leader.person,
  });
  
  // Best streak
  const bestStreak = Object.entries(stats).reduce((max, [person, stat]) => 
    stat.longestStreak > max.streak ? { person: person as 'J' | 'A' | 'M', streak: stat.longestStreak } : max,
    { person: 'J' as 'J' | 'A' | 'M', streak: 0 }
  );
  
  insights.push({
    type: 'streak',
    title: `${bestStreak.person} has the longest streak`,
    description: `Maintained consistency for ${bestStreak.streak} consecutive days`,
    metric: `${bestStreak.streak} days`,
    person: bestStreak.person,
  });
  
  // Peak performer this month
  const monthlyLeader = Object.entries(stats).reduce((max, [person, stat]) => 
    stat.currentMonth > max.count ? { person: person as 'J' | 'A' | 'M', count: stat.currentMonth } : max,
    { person: 'J' as 'J' | 'A' | 'M', count: 0 }
  );
  
  insights.push({
    type: 'peak',
    title: `${monthlyLeader.person} is leading this month`,
    description: `Most active in the current month with ${monthlyLeader.count} total`,
    metric: `${monthlyLeader.count} this month`,
    person: monthlyLeader.person,
  });
  
  // Day of week pattern
  const dayOfWeekCounts: { [key: string]: number } = {};
  dataPoints.forEach(d => {
    const dayName = new Date(d.date).toLocaleDateString('en-US', { weekday: 'long' });
    const total = d.J + d.A + d.M;
    dayOfWeekCounts[dayName] = (dayOfWeekCounts[dayName] || 0) + total;
  });
  const peakDayOfWeek = Object.entries(dayOfWeekCounts).reduce((max, [day, count]) => 
    count > max.count ? { day, count } : max,
    { day: '', count: 0 }
  );
  
  insights.push({
    type: 'pattern',
    title: `${peakDayOfWeek.day}s are the most active`,
    description: `Overall activity peaks on ${peakDayOfWeek.day}s across all individuals`,
    metric: `${peakDayOfWeek.count} total`,
  });
  
  // Recent trend
  const last7Days = dataPoints.slice(-7);
  const prev7Days = dataPoints.slice(-14, -7);
  const recentTotal = last7Days.reduce((sum, d) => sum + d.J + d.A + d.M, 0);
  const previousTotal = prev7Days.reduce((sum, d) => sum + d.J + d.A + d.M, 0);
  const change = recentTotal - previousTotal;
  
  if (Math.abs(change) > 5) {
    insights.push({
      type: change > 0 ? 'pattern' : 'anomaly',
      title: change > 0 ? 'Activity increasing recently' : 'Activity decreasing recently',
      description: `Overall activity ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)} in the last week compared to the previous week`,
      metric: `${change > 0 ? '+' : ''}${change}`,
    });
  }
  
  return insights;
}
