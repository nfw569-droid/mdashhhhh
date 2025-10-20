import * as XLSX from 'xlsx';
import type { ParsedData, DataPoint, PersonStats, Insight } from '@shared/schema';

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
            if (!dateValue) continue;

            let parsedDate: Date | null = null;
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
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    persons.forEach((person) => {
        const personData = dataPoints.map((d) => ({ date: d.date, count: d[person] }));
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
        const weeksCount = Math.max(1, Math.floor(dataPoints.length / 7));
        const weeklyAvg = personData.reduce((sum, d) => sum + d.count, 0) / weeksCount;
        const monthsCount = Math.max(1, Math.floor(dataPoints.length / 30));
        const monthlyAvg = personData.reduce((sum, d) => sum + d.count, 0) / monthsCount;
        const peakDay = personData.reduce((max, d) => d.count > max.count ? d : max, { date: '', count: 0 });
        let longestStreak = 0;
        let currentStreak = 0;
        personData.forEach((d) => {
            if (d.count > 0) {
                currentStreak++;
                longestStreak = Math.max(longestStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        });
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
            peakDay: peakDay.date || dataPoints[0]?.date || '',
            peakDayCount: peakDay.count,
            longestStreak,
            quietestPeriod: quietestPeriod || dataPoints[0]?.date || '',
            totalDays: personData.filter((d) => d.count > 0).length,
        } as PersonStats;
    });

    return stats as { J: PersonStats; A: PersonStats; M: PersonStats };
}

function generateInsights(dataPoints: DataPoint[], stats: { J: PersonStats; A: PersonStats; M: PersonStats }) {
    const insights: Insight[] = [];
    const totals = { J: stats.J.yearTotal, A: stats.A.yearTotal, M: stats.M.yearTotal };
    const leader = Object.entries(totals).reduce((max, [person, total]) => total > max.total ? { person, total } : max, { person: 'J', total: 0 });
    insights.push({ type: 'comparison', title: `${leader.person} is the most active overall`, description: `With a total of ${leader.total} across the entire period`, metric: `${leader.total} total`, person: leader.person as 'J' | 'A' | 'M' });
    const bestStreak = Object.entries(stats).reduce((max, [person, stat]) => stat.longestStreak > max.streak ? { person, streak: stat.longestStreak } : max, { person: 'J', streak: 0 });
    insights.push({ type: 'streak', title: `${bestStreak.person} has the longest streak`, description: `Maintained consistency for ${bestStreak.streak} consecutive days`, metric: `${bestStreak.streak} days`, person: bestStreak.person as 'J' | 'A' | 'M' });
    const monthlyLeader = Object.entries(stats).reduce((max, [person, stat]) => stat.currentMonth > max.count ? { person, count: stat.currentMonth } : max, { person: 'J', count: 0 });
    insights.push({ type: 'peak', title: `${monthlyLeader.person} is leading this month`, description: `Most active in the current month with ${monthlyLeader.count} total`, metric: `${monthlyLeader.count} this month`, person: monthlyLeader.person as 'J' | 'A' | 'M' });
    const dayOfWeekCounts: { [key: string]: number } = {};
    dataPoints.forEach((d) => {
        const dayName = new Date(d.date).toLocaleDateString('en-US', { weekday: 'long' });
        const total = d.J + d.A + d.M;
        dayOfWeekCounts[dayName] = (dayOfWeekCounts[dayName] || 0) + total;
    });
    const peakDayOfWeek = Object.entries(dayOfWeekCounts).reduce((max, [day, count]) => count > max.count ? { day, count } : max, { day: '', count: 0 });
    insights.push({ type: 'pattern', title: `${peakDayOfWeek.day}s are the most active`, description: `Overall activity peaks on ${peakDayOfWeek.day}s across all individuals`, metric: `${peakDayOfWeek.count} total` });
    const last7Days = dataPoints.slice(-7);
    const prev7Days = dataPoints.slice(-14, -7);
    const recentTotal = last7Days.reduce((sum, d) => sum + d.J + d.A + d.M, 0);
    const previousTotal = prev7Days.reduce((sum, d) => sum + d.J + d.A + d.M, 0);
    const change = recentTotal - previousTotal;
    if (Math.abs(change) > 5) {
        insights.push({ type: change > 0 ? 'pattern' : 'anomaly', title: change > 0 ? 'Activity increasing recently' : 'Activity decreasing recently', description: `Overall activity ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)} in the last week compared to the previous week`, metric: `${change > 0 ? '+' : ''}${change}` });
    }

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
    const allData = [...history, ...backup].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const uniqueData = Array.from(new Map(allData.map((item) => [item.date, item])).values());
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const validData = uniqueData.filter((d) => new Date(d.date) <= today);
    if (validData.length === 0) throw new Error('No valid data parsed from workbook');
    const stats = computeStatistics(validData);
    const insights = generateInsights(validData, stats);
    const dateRange = { start: validData[0].date, end: validData[validData.length - 1].date };
    return { dataPoints: validData, stats, insights, dateRange } as ParsedData;
}

export async function parseFile(file: File): Promise<ParsedData> {
    if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const workbook = XLSX.read(text, { type: 'string' });
        const history = parseHistorySheet(workbook);
        const backup = parseBackupSheet(workbook);
        const allData = [...history, ...backup].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const uniqueData = Array.from(new Map(allData.map((item) => [item.date, item])).values());
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const validData = uniqueData.filter((d) => new Date(d.date) <= today);
        const stats = computeStatistics(validData);
        const insights = generateInsights(validData, stats);
        const dateRange = { start: validData[0].date, end: validData[validData.length - 1].date };
        return { dataPoints: validData, stats, insights, dateRange } as ParsedData;
    }

    const buffer = await file.arrayBuffer();
    return parseExcelArrayBuffer(buffer);
}
