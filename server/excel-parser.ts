import * as XLSX from 'xlsx';
import type { DataPoint, ParsedData, PersonStats, Insight } from '@shared/schema';

// Default Google Sheet ID (can be overridden with GOOGLE_SHEET_ID env var)
const DEFAULT_SHEET_ID = '1ySZREUibTSLKv8YgJ08wo-FJlBjPrB86RJ9lWpZnH1k';

// Fixed analysis window start per request: 10 July 2023 (month index 6)
const ANALYSIS_START = new Date(2023, 6, 10);

function parseExcelDate(dateValue: any): Date | null {
  if (!dateValue && dateValue !== 0) return null;
  if (dateValue instanceof Date) return dateValue;
  // Excel serial date (number) fallback
  if (typeof dateValue === 'number') {
    // Prefer XLSX.SSF.parse_date_code when available
    const ssf: any = (XLSX as any).SSF;
    if (ssf && typeof ssf.parse_date_code === 'function') {
      try {
        const excelDate = ssf.parse_date_code(dateValue);
        if (excelDate && excelDate.y) {
          return new Date(Date.UTC(excelDate.y, excelDate.m - 1, excelDate.d));
        }
      } catch (err) {
        // fall through to numeric conversion
      }
    }

    // Fallback conversion (handles Excel 1900 leap-year bug by adjusting if serial > 60)
    const serial = dateValue;
    const epoch = Date.UTC(1899, 11, 30); // Excel epoch
    const days = serial > 60 ? serial - 1 : serial; // Excel bug: 1900 is treated as leap year
    const ms = Math.round(days * 24 * 60 * 60 * 1000);
    return new Date(epoch + ms);
  }

  if (typeof dateValue === 'string') {
    const d = new Date(dateValue);
    if (!isNaN(d.getTime())) return d;
    return null;
  }

  return null;
}

async function fetchWorkbookFromGoogleSheet(sheetId: string): Promise<XLSX.WorkBook> {
  const id = sheetId || DEFAULT_SHEET_ID;
  const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;

  // Use global fetch (Node 18+ or browser). If not available, throw an informative error.
  const fetchFn = (globalThis as any).fetch as ((input: RequestInfo, init?: RequestInit) => Promise<Response>) | undefined;
  if (!fetchFn) {
    throw new Error('No fetch implementation available. Run on Node 18+ or install a global fetch polyfill (e.g. node-fetch).');
  }
  const res = await fetchFn(url as any);
  if (!res.ok) throw new Error(`Failed to fetch Google Sheet: ${res.status} ${res.statusText}`);
  const buffer = await res.arrayBuffer();
  const workbook = XLSX.read(Buffer.from(buffer), { type: 'buffer' } as any);
  return workbook;
}

export async function parseExcelFile(): Promise<ParsedData> {
  const sheetId = process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;
  const workbook = await fetchWorkbookFromGoogleSheet(sheetId);

  console.log('Available sheets:', workbook.SheetNames);

  // Parse history and backup (same logic as before)
  const historyData = parseHistorySheet(workbook);
  console.log(`Parsed ${historyData.length} points from history sheet`);
  const backupData = parseBackupSheet(workbook);
  console.log(`Parsed ${backupData.length} points from backup sheet`);

  const combinedMap: Record<string, { date: string; J: number; A: number; M: number }> = {};
  [...historyData, ...backupData].forEach(item => {
    if (!combinedMap[item.date]) combinedMap[item.date] = { date: item.date, J: 0, A: 0, M: 0 };
    combinedMap[item.date].J += Number(item.J || 0);
    combinedMap[item.date].A += Number(item.A || 0);
    combinedMap[item.date].M += Number(item.M || 0);
  });

  const uniqueData = Object.values(combinedMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Filter out future dates (dates after today)
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const validData = uniqueData.filter(d => new Date(d.date) <= today);

  console.log(`Total unique data points: ${validData.length} (filtered ${uniqueData.length - validData.length} future dates)`);

  const stats = computeStatistics(validData);
  const insights = generateInsights(validData, stats);

  // Analysis window end should be today's date (inclusive). This matches requirement:
  // calculations are from 2023-07-10 through today's date only.
  const analysisEnd = new Date();
  analysisEnd.setHours(23, 59, 59, 999);

  const dateRange = {
    start: ANALYSIS_START.toISOString().split('T')[0],
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
      parsedDate = parseExcelDate(dateValue);
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
        parsedDate = parseExcelDate(dateValue);
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

  // Determine analysis window: use fixed analysis start (ANALYSIS_START) per requirements
  // Analysis end is today's date (inclusive) — calculations cover 2023-07-10 -> today
  const analysisStart = new Date(ANALYSIS_START); // clone to avoid mutation
  const analysisEnd = new Date();
  analysisEnd.setHours(23, 59, 59, 999);
  const now = new Date(analysisEnd);

  // Get the current month's boundaries (1st to last day)
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Get the most recent Monday (for week start)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Calculate days to subtract to get to Monday
  weekStart.setHours(0, 0, 0, 0);
  // Year totals should be calculated from the analysisStart (2023-07-10) onward
  const yearStart = new Date(analysisStart);

  // create map date -> {J,A,M} but only include entries within analysis window
  const map: { [iso: string]: { J: number; A: number; M: number } } = {};
  dataPoints.forEach(d => {
    const dt = new Date(d.date);
    if (dt >= analysisStart && dt <= analysisEnd) {
      map[d.date] = { J: d.J, A: d.A, M: d.M };
    }
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
    const lastDateOrig = new Date(dataPoints[dataPoints.length - 1].date);
    const analysisEnd = lastDateOrig > new Date(2025, 9, 19) ? new Date(2025, 9, 19) : lastDateOrig;
    const analysisStart = new Date(ANALYSIS_START); // use fixed start
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

  // Recent trend - use complete Monday-Sunday weeks
  const today = new Date();
  // Find last Sunday
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - today.getDay());
  lastSunday.setHours(23, 59, 59, 999);

  // Find the Monday 7 days before that (for previous week)
  const prevWeekMonday = new Date(lastSunday);
  prevWeekMonday.setDate(lastSunday.getDate() - 13); // Go back 13 days to get to Monday
  prevWeekMonday.setHours(0, 0, 0, 0);

  // Get complete weeks (Monday-Sunday)
  const thisWeekData = dataPoints.filter(d => {
    const date = new Date(d.date);
    const prevMonday = new Date(lastSunday);
    prevMonday.setDate(lastSunday.getDate() - 6);
    return date >= prevMonday && date <= lastSunday;
  });

  const prevWeekData = dataPoints.filter(d => {
    const date = new Date(d.date);
    const prevSunday = new Date(prevWeekMonday);
    prevSunday.setDate(prevWeekMonday.getDate() + 6);
    return date >= prevWeekMonday && date <= prevSunday;
  });

  const recentTotal = thisWeekData.reduce((sum, d) => sum + d.J + d.A + d.M, 0);
  const previousTotal = prevWeekData.reduce((sum, d) => sum + d.J + d.A + d.M, 0);
  const change = recentTotal - previousTotal; if (Math.abs(change) > 5) {
    insights.push({
      type: change > 0 ? 'pattern' : 'anomaly',
      title: change > 0 ? 'Activity increasing recently' : 'Activity decreasing recently',
      description: `Overall activity ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)} in the last complete week (Monday-Sunday) compared to the previous week.`,
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
