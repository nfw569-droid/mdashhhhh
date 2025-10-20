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

  // Merge data and combine duplicate dates by summing counts
  const combinedMap: Record<string, { date: string; J: number; A: number; M: number }> = {};
  [...historyData, ...backupData].forEach(item => {
    if (!combinedMap[item.date]) combinedMap[item.date] = { date: item.date, J: 0, A: 0, M: 0 };
    combinedMap[item.date].J += Number(item.J || 0);
    combinedMap[item.date].A += Number(item.A || 0);
    combinedMap[item.date].M += Number(item.M || 0);
  });

  // Sorted unique data points (one entry per date)
  const uniqueData = Object.values(combinedMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Filter out future dates (dates after today)
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  const validData = uniqueData.filter(d => new Date(d.date) <= today);

  console.log(`Total unique data points: ${validData.length} (filtered ${uniqueData.length - validData.length} future dates)`);

  // Compute statistics
  const stats = computeStatistics(validData);

  // Generate insights
  const insights = generateInsights(validData, stats);

  // Align returned dateRange with the analysis window used in computeStatistics:
  const firstDateOrig = new Date(validData[0].date);
  const analysisStart = new Date(firstDateOrig.getFullYear(), firstDateOrig.getMonth(), 1);
  const lastDateOrig = new Date(validData[validData.length - 1].date);
  const capEnd = new Date(2025, 9, 19);
  const analysisEnd = lastDateOrig > capEnd ? capEnd : lastDateOrig;

  const dateRange = {
    start: analysisStart.toISOString().split('T')[0],
    end: analysisEnd.toISOString().split('T')[0],
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
      let parsedDate: Date | null = null;

      // Treat missing cells or cells with '###' as continuation of previous date
      if (!dateValue || String(dateValue).includes('#')) {
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

  if (dataPoints.length === 0) {
    persons.forEach(person => {
      stats[person] = {
        person,
        currentWeek: 0,
        currentMonth: 0,
        yearTotal: 0,
        weeklyAvg: 0,
        monthlyAvg: 0,
        peakDay: '',
        peakDayCount: 0,
        longestStreak: 0,
        longestZeroStreak: 0,
        quietestPeriod: '',
        totalDays: 0,
        totalCount: 0,
      };
    });
    return stats;
  }

  // Determine analysis window: start at the month-start of first data point,
  // and cap the end at 2025-10-19 as requested.
  const firstDateOrig = new Date(dataPoints[0].date);
  const lastDateOrig = new Date(dataPoints[dataPoints.length - 1].date);
  const analysisStart = new Date(firstDateOrig.getFullYear(), firstDateOrig.getMonth(), 1);
  const capEnd = new Date(2025, 9, 19); // October 19, 2025 (month is 0-based)
  const analysisEnd = lastDateOrig > capEnd ? capEnd : lastDateOrig;

  // Use analysisEnd as the "now" reference so current week/month/year are relative to dataset end
  const now = new Date(analysisEnd);

  // Current month and week boundaries relative to analysisEnd
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const yearStartCandidate = new Date(now.getFullYear(), 0, 1);
  const yearStart = analysisStart > yearStartCandidate ? analysisStart : yearStartCandidate;

  // create map date -> {J,A,M}
  const map: { [iso: string]: { J: number; A: number; M: number } } = {};
  dataPoints.forEach(d => {
    map[d.date] = { J: d.J, A: d.A, M: d.M };
  });

  // Build timeline from analysisStart to analysisEnd (inclusive)
  const timeline: { date: string; J: number; A: number; M: number }[] = [];
  for (let d = new Date(analysisStart); d <= analysisEnd; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().split('T')[0];
    const entry = map[iso] || { J: 0, A: 0, M: 0 };
    timeline.push({ date: iso, J: entry.J, A: entry.A, M: entry.M });
  }

  // For each person compute metrics using timeline
  persons.forEach(person => {
    const personData = timeline.map(t => ({ date: t.date, count: t[person] }));

    const currentWeek = personData
      .filter(d => {
        const date = new Date(d.date);
        return date >= weekStart && date <= now;
      })
      .reduce((sum, d) => sum + d.count, 0);

    const currentMonth = personData
      .filter(d => {
        const date = new Date(d.date);
        return date >= currentMonthStart && date <= currentMonthEnd;
      })
      .reduce((sum, d) => sum + d.count, 0);

    const yearTotal = personData
      .filter(d => {
        const date = new Date(d.date);
        return date >= yearStart && date <= now;
      })
      .reduce((sum, d) => sum + d.count, 0);

    const totalDays = personData.length;
    const totalCount = personData.reduce((s, d) => s + d.count, 0);
    const zeroDays = personData.filter(d => d.count === 0).length;
    const weeks = totalDays / 7;
    const months = totalDays / 30.436875;
    const weeklyAvg = weeks > 0 ? totalCount / weeks : 0;
    const monthlyAvg = months > 0 ? totalCount / months : 0;

    const peak = personData.reduce((max, d) => d.count > max.count ? d : max, { date: '', count: -1 });

    let longestStreak = 0; let currentStreak = 0; let longestZeroStreak = 0; let currentZeroStreak = 0;
    personData.forEach(d => {
      if (d.count > 0) { currentStreak++; longestStreak = Math.max(longestStreak, currentStreak); currentZeroStreak = 0; }
      else { currentZeroStreak++; longestZeroStreak = Math.max(longestZeroStreak, currentZeroStreak); currentStreak = 0; }
    });

    let quietestPeriod = '';
    let minWeeklyTotal = Infinity;
    for (let i = 0; i <= personData.length - 7; i++) {
      const weekTotal = personData.slice(i, i + 7).reduce((sum, d) => sum + d.count, 0);
      if (weekTotal < minWeeklyTotal) { minWeeklyTotal = weekTotal; quietestPeriod = personData[i].date; }
    }

    stats[person] = {
      person,
      currentWeek,
      currentMonth,
      yearTotal,
      weeklyAvg,
      monthlyAvg,
      peakDay: peak.date || timeline[0].date,
      peakDayCount: peak.count < 0 ? 0 : peak.count,
      longestStreak,
      zeroDays,
      longestZeroStreak,
      quietestPeriod: quietestPeriod || timeline[0].date,
      totalDays: personData.filter(d => d.count > 0).length,
      totalCount,
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

  // Find overall leader based on totalCount over the entire timeline
  const totals = {
    J: stats.J.totalCount,
    A: stats.A.totalCount,
    M: stats.M.totalCount,
  };
  const leader = Object.entries(totals).reduce((max, [person, total]) =>
    total > max.total ? { person: person as 'J' | 'A' | 'M', total } : max,
    { person: 'J' as 'J' | 'A' | 'M', total: 0 }
  );

  insights.push({
    type: 'comparison',
    title: `${leader.person} is the most active overall`,
    description: `With a total of ${leader.total} across the entire period. This is the sum of daily counts for that person over the analysis window.`,
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
    description: `Maintained consistency for ${bestStreak.streak} consecutive days. This is the longest run of days with at least one activity.`,
    metric: `${bestStreak.streak} days`,
    person: bestStreak.person,
  });

  // Longest zero streak (quietest dry run)
  const bestZero = Object.entries(stats).reduce((max, [person, stat]) =>
    stat.longestZeroStreak > max.streak ? { person: person as 'J' | 'A' | 'M', streak: stat.longestZeroStreak } : max,
    { person: 'J' as 'J' | 'A' | 'M', streak: 0 }
  );
  if (bestZero.streak > 0) {
    insights.push({
      type: 'streak',
      title: `${bestZero.person} had the longest dry streak`,
      description: `A longest run of ${bestZero.streak} consecutive days with zero activity. This highlights the longest period of inactivity for that person.`,
      metric: `${bestZero.streak} days`,
      person: bestZero.person,
    });
  }

  // Peak performer this month
  const monthlyLeader = Object.entries(stats).reduce((max, [person, stat]) =>
    stat.currentMonth > max.count ? { person: person as 'J' | 'A' | 'M', count: stat.currentMonth } : max,
    { person: 'J' as 'J' | 'A' | 'M', count: 0 }
  );

  insights.push({
    type: 'peak',
    title: `${monthlyLeader.person} is leading this month`,
    description: `Most active in the current month with ${monthlyLeader.count} total. Counts are within the current month of the analysis window.`,
    metric: `${monthlyLeader.count} this month`,
    person: monthlyLeader.person,
  });

  // Day of week pattern
  // Day of week pattern — aggregate Monday→Sunday over the analysis window
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayOfWeekCounts: { [key: string]: number } = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0 };
  if (dataPoints.length > 0) {
    const firstDateOrig = new Date(dataPoints[0].date);
    const lastDateOrig = new Date(dataPoints[dataPoints.length - 1].date);
    const analysisStart = new Date(firstDateOrig.getFullYear(), firstDateOrig.getMonth(), 1);
    const capEnd = new Date(2025, 9, 19);
    const analysisEnd = lastDateOrig > capEnd ? capEnd : lastDateOrig;
    const map: { [iso: string]: DataPoint } = {};
    dataPoints.forEach(d => map[d.date] = d);
    for (let d = new Date(analysisStart); d <= analysisEnd; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().split('T')[0];
      const entry = map[iso] || { date: iso, J: 0, A: 0, M: 0 };
      const total = (entry.J || 0) + (entry.A || 0) + (entry.M || 0);
      const weekday = d.getDay(); // 0=Sun .. 6=Sat
      const monIndex = (weekday + 6) % 7; // convert to 0=Mon .. 6=Sun
      const name = dayNames[monIndex];
      dayOfWeekCounts[name] += total;
    }
  }
  const peakDayOfWeek = Object.entries(dayOfWeekCounts).reduce((max, [day, count]) =>
    count > max.count ? { day, count } : max,
    { day: '', count: 0 }
  );

  insights.push({
    type: 'pattern',
    title: `${peakDayOfWeek.day}s are the most active`,
    description: `Overall activity peaks on ${peakDayOfWeek.day}s across all individuals. Aggregated Monday→Sunday over the analysis window.`,
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
      description: `Overall activity ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)} in the last week compared to the previous week. Compares the last 7 calendar days vs the previous 7-day block.`,
      metric: `${change > 0 ? '+' : ''}${change}`,
    });
  }

  // Zero-day counts: how many calendar days each person had a count of exactly 0
  insights.push({
    type: 'pattern',
    title: 'Days with zero activity',
    description: `Counts of calendar days with zero activity per person (within analysis window).`,
    metric: `J:${stats.J.zeroDays} A:${stats.A.zeroDays} M:${stats.M.zeroDays}`,
  });

  return insights;
}
