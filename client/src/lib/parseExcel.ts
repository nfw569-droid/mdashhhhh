import * as XLSX from 'xlsx';
import type { ParsedData, DataPoint, PersonStats, Insight } from '@shared/schema';

const ANALYSIS_START = new Date(2023, 6, 10); // July 10, 2023
const GOOGLE_SHEET_ID = '1ySZREUibTSLKv8YgJ08wo-FJlBjPrB86RJ9lWpZnH1k';

// Function to fetch and parse Google Sheet directly
export async function fetchAndParseGoogleSheet(): Promise<ParsedData> {
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=xlsx`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch Google Sheet');
    const buffer = await response.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });

    const historyData = parseHistorySheet(workbook);
    const backupData = parseBackupSheet(workbook);

    const combinedMap: Record<string, { date: string; J: number; A: number; M: number }> = {};
    [...historyData, ...backupData].forEach(item => {
        if (!combinedMap[item.date]) combinedMap[item.date] = { date: item.date, J: 0, A: 0, M: 0 };
        combinedMap[item.date].J += Number(item.J || 0);
        combinedMap[item.date].A += Number(item.A || 0);
        combinedMap[item.date].M += Number(item.M || 0);
    });

    const uniqueData = Object.values(combinedMap)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Filter out future dates
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const validData = uniqueData.filter(d => new Date(d.date) <= today);

    const stats = computeStatistics(validData);
    const insights = generateInsights(validData, stats);

    const analysisEnd = new Date();
    analysisEnd.setHours(23, 59, 59, 999);

    return {
        dataPoints: validData,
        stats,
        insights,
        dateRange: {
            start: ANALYSIS_START.toISOString().split('T')[0],
            end: analysisEnd.toISOString().split('T')[0],
        }
    };
}

function parseHistorySheet(workbook: XLSX.WorkBook): DataPoint[] {
    const sheet = workbook.Sheets['history'];
    if (!sheet) return [];
    const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const dataPoints: DataPoint[] = [];
    let lastValidDate: Date | null = null;

    const headerRow = data[1];
    if (!headerRow) return [];

    const dateCol = headerRow.indexOf('Date');
    const jCol = headerRow.indexOf('J');
    const aCol = headerRow.indexOf('A');
    const mCol = headerRow.indexOf('M');
    if (dateCol === -1 || jCol === -1 || aCol === -1 || mCol === -1) return [];

    for (let i = 2; i < data.length; i++) {
        const row = data[i];
        if (!Array.isArray(row) || row.length === 0) continue;

        let dateValue = row[dateCol];
        let parsedDate: Date | null = null;

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
            } else if (dateValue instanceof Date) {
                parsedDate = dateValue;
            }

            if (!parsedDate || isNaN(parsedDate.getTime())) continue;
        }

        lastValidDate = parsedDate;

        const jValue = Number(row[jCol]) || 0;
        const aValue = Number(row[aCol]) || 0;
        const mValue = Number(row[mCol]) || 0;

        dataPoints.push({ date: parsedDate.toISOString().split('T')[0], J: jValue, A: aValue, M: mValue });
    }

    return dataPoints;
}

function parseBackupSheet(workbook: XLSX.WorkBook): DataPoint[] {
    const sheet = workbook.Sheets['backup'];
    if (!sheet) return [];
    const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const dataPoints: DataPoint[] = [];
    if (data.length < 2) return [];

    const headerRow = data[1];
    const dateColumns: number[] = [];
    for (let i = 0; i < headerRow.length; i++) {
        if (headerRow[i] === 'Date') dateColumns.push(i);
    }

    dateColumns.forEach((dateCol) => {
        let lastValidDate: Date | null = null;
        for (let i = 3; i < data.length; i++) {
            const row = data[i];
            if (!Array.isArray(row) || row.length === 0) continue;
            const dateValue = row[dateCol];

            let parsedDate: Date | null = null;
            // Treat missing or '###' as continuation
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
                if (!parsedDate || isNaN(parsedDate.getTime())) continue;
            }

            lastValidDate = parsedDate;
            const jValue = Number(row[dateCol + 1]) || 0;
            const aValue = Number(row[dateCol + 2]) || 0;
            const mValue = Number(row[dateCol + 3]) || 0;
            dataPoints.push({ date: parsedDate.toISOString().split('T')[0], J: jValue, A: aValue, M: mValue });
        }
    });

    return dataPoints;

}

function computeStatistics(dataPoints: DataPoint[]) {
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
            } as PersonStats;
        });
        return stats as { J: PersonStats; A: PersonStats; M: PersonStats };
    }

    const analysisStart = new Date(ANALYSIS_START);
    const analysisEnd = new Date();
    analysisEnd.setHours(23, 59, 59, 999);
    const now = new Date(analysisEnd);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get the most recent Monday for week start (Monday-Sunday week)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Get back to Monday
    weekStart.setHours(0, 0, 0, 0);
    const yearStart = new Date(analysisStart);

    const map: { [iso: string]: { J: number; A: number; M: number } } = {};
    dataPoints.forEach(d => { map[d.date] = { J: d.J, A: d.A, M: d.M }; });
    const timeline: { date: string; J: number; A: number; M: number }[] = [];
    for (let d = new Date(analysisStart); d <= analysisEnd; d.setDate(d.getDate() + 1)) {
        const iso = d.toISOString().split('T')[0];
        const entry = map[iso] || { J: 0, A: 0, M: 0 };
        timeline.push({ date: iso, J: entry.J, A: entry.A, M: entry.M });
    }

    persons.forEach((person) => {
        const personData = timeline.map((t) => ({ date: t.date, count: t[person] }));
        const currentWeek = personData.filter((d) => {
            const date = new Date(d.date);
            return date >= weekStart && date <= now;
        }).reduce((sum, d) => sum + d.count, 0);
        const currentMonth = personData.filter((d) => {
            const date = new Date(d.date);
            return date >= currentMonthStart && date <= currentMonthEnd;
        }).reduce((sum, d) => sum + d.count, 0);
        const yearTotal = personData.filter((d) => {
            const date = new Date(d.date);
            return date >= yearStart && date <= now;
        }).reduce((sum, d) => sum + d.count, 0);
        const totalDays = personData.length;
        const totalCount = personData.reduce((s, d) => s + d.count, 0);
        const zeroDays = personData.filter((d) => d.count === 0).length;
        const weeks = totalDays / 7;
        const months = totalDays / 30.436875;
        const weeklyAvg = weeks > 0 ? totalCount / weeks : 0;
        const monthlyAvg = months > 0 ? totalCount / months : 0;
        const peakDay = personData.reduce((max, d) => d.count > max.count ? d : max, { date: '', count: -1 });
        let longestStreak = 0; let currentStreak = 0; let longestZeroStreak = 0; let currentZeroStreak = 0;
        personData.forEach((d) => {
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
            peakDay: peakDay.date || timeline[0].date,
            peakDayCount: peakDay.count < 0 ? 0 : peakDay.count,
            longestStreak,
            longestZeroStreak,
            zeroDays,
            quietestPeriod: quietestPeriod || timeline[0].date,
            totalDays: personData.filter((d) => d.count > 0).length,
            totalCount,
        } as PersonStats;
    });

    return stats as { J: PersonStats; A: PersonStats; M: PersonStats };
}

function generateInsights(dataPoints: DataPoint[], stats: { J: PersonStats; A: PersonStats; M: PersonStats }) {
    const insights: Insight[] = [];
    const totals = { J: stats.J.totalCount, A: stats.A.totalCount, M: stats.M.totalCount };
    const leader = Object.entries(totals).reduce((max, [person, total]) => total > max.total ? { person, total } : max, { person: 'J', total: 0 });
    insights.push({ type: 'comparison', title: `${leader.person} is the most active overall`, description: `With a total of ${leader.total} across the entire period`, metric: `${leader.total} total`, person: leader.person as 'J' | 'A' | 'M' });
    const bestStreak = Object.entries(stats).reduce((max, [person, stat]) => stat.longestStreak > max.streak ? { person, streak: stat.longestStreak } : max, { person: 'J', streak: 0 });
    insights.push({ type: 'streak', title: `${bestStreak.person} has the longest streak`, description: `Maintained consistency for ${bestStreak.streak} consecutive days`, metric: `${bestStreak.streak} days`, person: bestStreak.person as 'J' | 'A' | 'M' });
    // Longest zero (dry) streak
    const bestZero = Object.entries(stats).reduce((max, [person, stat]) => stat.longestZeroStreak > max.streak ? { person, streak: stat.longestZeroStreak } : max, { person: 'J', streak: 0 });
    if (bestZero.streak > 0) {
        insights.push({ type: 'streak', title: `${bestZero.person} had the longest dry streak`, description: `A longest run of ${bestZero.streak} consecutive days with zero activity`, metric: `${bestZero.streak} days`, person: bestZero.person as 'J' | 'A' | 'M' });
    }
    const monthlyLeader = Object.entries(stats).reduce((max, [person, stat]) => stat.currentMonth > max.count ? { person, count: stat.currentMonth } : max, { person: 'J', count: 0 });
    insights.push({ type: 'peak', title: `${monthlyLeader.person} is leading this month`, description: `Most active in the current month with ${monthlyLeader.count} total`, metric: `${monthlyLeader.count} this month`, person: monthlyLeader.person as 'J' | 'A' | 'M' });
    // Day of week aggregation Monday->Sunday over analysis window
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayOfWeekCounts: { [key: string]: number } = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0 };
    if (dataPoints.length > 0) {
        const analysisEnd = new Date();
        analysisEnd.setHours(23, 59, 59, 999);
        const analysisStart = new Date(ANALYSIS_START);
        const map: { [iso: string]: DataPoint } = {};
        dataPoints.forEach(d => map[d.date] = d);
        for (let d = new Date(analysisStart); d <= analysisEnd; d.setDate(d.getDate() + 1)) {
            const iso = d.toISOString().split('T')[0];
            const entry = map[iso] || { date: iso, J: 0, A: 0, M: 0 };
            const total = entry.J + entry.A + entry.M;
            const weekday = d.getDay();
            const monIndex = (weekday + 6) % 7; // 0=Mon .. 6=Sun
            dayOfWeekCounts[dayNames[monIndex]] += total;
        }
    }
    const peakDayOfWeek = Object.entries(dayOfWeekCounts).reduce((max, [day, count]) => count > max.count ? { day, count } : max, { day: '', count: 0 });
    insights.push({ type: 'pattern', title: `${peakDayOfWeek.day}s are the most active`, description: `Overall activity peaks on ${peakDayOfWeek.day}s across all individuals`, metric: `${peakDayOfWeek.count} total` });
    // for recent trend, use timeline to include missing days as zeros
    const firstDate = new Date(dataPoints[0].date);
    const lastDate = new Date(dataPoints[dataPoints.length - 1].date);
    const map: { [iso: string]: DataPoint } = {};
    dataPoints.forEach(d => map[d.date] = d);
    const timeline: DataPoint[] = [];
    for (let d = new Date(firstDate); d <= lastDate; d.setDate(d.getDate() + 1)) {
        const iso = d.toISOString().split('T')[0];
        timeline.push(map[iso] || { date: iso, J: 0, A: 0, M: 0 });
    }
    const last7Days = timeline.slice(-7);
    const prev7Days = timeline.slice(-14, -7);
    const recentTotal = last7Days.reduce((sum, d) => sum + d.J + d.A + d.M, 0);
    const previousTotal = prev7Days.reduce((sum, d) => sum + d.J + d.A + d.M, 0);
    const change = recentTotal - previousTotal;
    if (Math.abs(change) > 5) {
        insights.push({ type: change > 0 ? 'pattern' : 'anomaly', title: change > 0 ? 'Activity increasing recently' : 'Activity decreasing recently', description: `Overall activity ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)} in the last week compared to the previous week. Compares the last 7 calendar days vs the previous 7-day block.`, metric: `${change > 0 ? '+' : ''}${change}` });
    }

    // Zero-day counts insight (how many calendar days each person had zero activity)
    insights.push({ type: 'pattern', title: 'Days with zero activity', description: `Counts of calendar days with zero activity per person (within analysis window).`, metric: `J:${stats.J.zeroDays} A:${stats.A.zeroDays} M:${stats.M.zeroDays}` });

    // Additional creative insights
    // Volatility: standard deviation of daily totals
    const dailyTotals: number[] = dataPoints.map(d => d.J + d.A + d.M);
    const mean = dailyTotals.reduce((s: number, v: number) => s + v, 0) / Math.max(1, dailyTotals.length);
    const variance = dailyTotals.reduce((s: number, v: number) => s + Math.pow(v - mean, 2), 0) / Math.max(1, dailyTotals.length);
    const stddev = Math.sqrt(variance);
    insights.push({ type: 'pattern', title: 'Volatility', description: `Daily activity stddev is ${stddev.toFixed(2)} — ${stddev > 5 ? 'highly variable' : 'relatively stable'}`, metric: `${stddev.toFixed(2)}` });

    // Consistency score: percent of days with at least one activity
    const daysWithActivity = dailyTotals.filter((t: number) => t > 0).length;
    const consistency = Math.round((daysWithActivity / Math.max(1, dailyTotals.length)) * 100);
    insights.push({ type: 'comparison', title: 'Consistency', description: `You were active on ${consistency}% of days in the dataset`, metric: `${consistency}%` });

    // Top 3 peak dates
    const sortedByTotal = dataPoints.slice().sort((a, b) => (b.J + b.A + b.M) - (a.J + a.A + a.M));
    const top3 = sortedByTotal.slice(0, 3).map(d => `${d.date} (${d.J + d.A + d.M})`).join(', ');
    if (top3) insights.push({ type: 'peak', title: 'Top peak dates', description: `Top 3 heaviest days: ${top3}`, metric: '' });

    // Pairwise Pearson correlations between J, A, M
    const arrJ = dataPoints.map(d => d.J);
    const arrA = dataPoints.map(d => d.A);
    const arrM = dataPoints.map(d => d.M);
    const pearson = (x: number[], y: number[]) => {
        const n = Math.min(x.length, y.length);
        if (n === 0) return 0;
        const mx = x.reduce((s, v) => s + v, 0) / n;
        const my = y.reduce((s, v) => s + v, 0) / n;
        let num = 0, denx = 0, deny = 0;
        for (let i = 0; i < n; i++) {
            const dx = x[i] - mx;
            const dy = y[i] - my;
            num += dx * dy;
            denx += dx * dx;
            deny += dy * dy;
        }
        const denom = Math.sqrt(denx * deny);
        if (denom === 0) return 0;
        return num / denom;
    };

    const corrJA = pearson(arrJ, arrA);
    const corrJM = pearson(arrJ, arrM);
    const corrAM = pearson(arrA, arrM);
    insights.push({ type: 'pattern', title: 'Pairwise correlations', description: `J-A: ${corrJA.toFixed(2)}, J-M: ${corrJM.toFixed(2)}, A-M: ${corrAM.toFixed(2)}`, metric: '' });
    return insights;
}

export async function parseExcelArrayBuffer(buffer: ArrayBuffer): Promise<ParsedData> {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const history = parseHistorySheet(workbook);
    const backup = parseBackupSheet(workbook);
    const allData = [...history, ...backup];
    const combinedMap: Record<string, { date: string; J: number; A: number; M: number }> = {};
    allData.forEach(item => {
        if (!combinedMap[item.date]) combinedMap[item.date] = { date: item.date, J: 0, A: 0, M: 0 };
        combinedMap[item.date].J += Number(item.J || 0);
        combinedMap[item.date].A += Number(item.A || 0);
        combinedMap[item.date].M += Number(item.M || 0);
    });
    const uniqueData = Object.values(combinedMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const validData = uniqueData.filter((d) => new Date(d.date) <= today);
    if (validData.length === 0) throw new Error('No valid data parsed from workbook');
    const stats = computeStatistics(validData);
    const insights = generateInsights(validData, stats);
    const analysisEnd = new Date(); analysisEnd.setHours(23, 59, 59, 999);
    const dateRange = { start: ANALYSIS_START.toISOString().split('T')[0], end: analysisEnd.toISOString().split('T')[0] };
    return { dataPoints: validData, stats, insights, dateRange } as ParsedData;
}

export async function parseFile(file: File): Promise<ParsedData> {
    if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const workbook = XLSX.read(text, { type: 'string' });
        const history = parseHistorySheet(workbook);
        const backup = parseBackupSheet(workbook);
        const allData = [...history, ...backup];
        const combinedMap: Record<string, { date: string; J: number; A: number; M: number }> = {};
        allData.forEach(item => {
            if (!combinedMap[item.date]) combinedMap[item.date] = { date: item.date, J: 0, A: 0, M: 0 };
            combinedMap[item.date].J += Number(item.J || 0);
            combinedMap[item.date].A += Number(item.A || 0);
            combinedMap[item.date].M += Number(item.M || 0);
        });
        const uniqueData = Object.values(combinedMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const validData = uniqueData.filter((d) => new Date(d.date) <= today);
        const stats = computeStatistics(validData);
        const insights = generateInsights(validData, stats);
        const analysisEnd = new Date(); analysisEnd.setHours(23, 59, 59, 999);
        const dateRange = { start: ANALYSIS_START.toISOString().split('T')[0], end: analysisEnd.toISOString().split('T')[0] };
        return { dataPoints: validData, stats, insights, dateRange } as ParsedData;
    }

    const buffer = await file.arrayBuffer();
    return parseExcelArrayBuffer(buffer);
}
