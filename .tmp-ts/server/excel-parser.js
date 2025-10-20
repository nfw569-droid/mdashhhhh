"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseExcelFile = parseExcelFile;
var xlsx_1 = __importDefault(require("xlsx"));
var path = __importStar(require("path"));
var fs = __importStar(require("fs"));
function parseExcelFile() {
    return __awaiter(this, void 0, void 0, function () {
        var filePath, workbook, historyData, backupData, combinedMap, uniqueData, today, validData, stats, insights, firstDateOrig, analysisStart, lastDateOrig, capEnd, analysisEnd, dateRange;
        return __generator(this, function (_a) {
            filePath = path.join(process.cwd(), 'attached_assets', '23-24data_1760901829734.xlsx');
            if (!fs.existsSync(filePath)) {
                throw new Error("Excel file not found at ".concat(filePath));
            }
            workbook = xlsx_1.default.readFile(filePath);
            console.log('Available sheets:', workbook.SheetNames);
            historyData = parseHistorySheet(workbook);
            console.log("Parsed ".concat(historyData.length, " points from history sheet"));
            backupData = parseBackupSheet(workbook);
            console.log("Parsed ".concat(backupData.length, " points from backup sheet"));
            combinedMap = {};
            __spreadArray(__spreadArray([], historyData, true), backupData, true).forEach(function (item) {
                if (!combinedMap[item.date])
                    combinedMap[item.date] = { date: item.date, J: 0, A: 0, M: 0 };
                combinedMap[item.date].J += Number(item.J || 0);
                combinedMap[item.date].A += Number(item.A || 0);
                combinedMap[item.date].M += Number(item.M || 0);
            });
            uniqueData = Object.values(combinedMap).sort(function (a, b) { return new Date(a.date).getTime() - new Date(b.date).getTime(); });
            today = new Date();
            today.setHours(23, 59, 59, 999); // End of today
            validData = uniqueData.filter(function (d) { return new Date(d.date) <= today; });
            console.log("Total unique data points: ".concat(validData.length, " (filtered ").concat(uniqueData.length - validData.length, " future dates)"));
            stats = computeStatistics(validData);
            insights = generateInsights(validData, stats);
            firstDateOrig = new Date(validData[0].date);
            analysisStart = new Date(firstDateOrig.getFullYear(), firstDateOrig.getMonth(), 1);
            lastDateOrig = new Date(validData[validData.length - 1].date);
            capEnd = new Date(2025, 9, 19);
            analysisEnd = lastDateOrig > capEnd ? capEnd : lastDateOrig;
            dateRange = {
                start: analysisStart.toISOString().split('T')[0],
                end: analysisEnd.toISOString().split('T')[0],
            };
            return [2 /*return*/, {
                    dataPoints: validData,
                    stats: stats,
                    insights: insights,
                    dateRange: dateRange,
                }];
        });
    });
}
function parseHistorySheet(workbook) {
    var sheet = workbook.Sheets['history'];
    if (!sheet) {
        console.warn('Sheet "history" not found');
        return [];
    }
    var data = xlsx_1.default.utils.sheet_to_json(sheet, { header: 1 });
    var dataPoints = [];
    var lastValidDate = null;
    // Find header row (should be row 1)
    // Header: ["Date","MM","Week","Day","J","A","M"]
    var headerRow = data[1];
    if (!headerRow) {
        console.warn('No header row found in history sheet');
        return [];
    }
    var dateCol = headerRow.indexOf('Date');
    var jCol = headerRow.indexOf('J');
    var aCol = headerRow.indexOf('A');
    var mCol = headerRow.indexOf('M');
    if (dateCol === -1 || jCol === -1 || aCol === -1 || mCol === -1) {
        console.warn('Could not find required columns in history sheet');
        return [];
    }
    console.log("History sheet columns - Date:".concat(dateCol, ", J:").concat(jCol, ", A:").concat(aCol, ", M:").concat(mCol));
    // Parse data rows (starting from row 2)
    for (var i = 2; i < data.length; i++) {
        var row = data[i];
        if (!Array.isArray(row) || row.length === 0)
            continue;
        var dateValue = row[dateCol];
        var parsedDate = null;
        // Handle ### date errors or missing dates
        if (!dateValue || String(dateValue).includes('#')) {
            if (lastValidDate) {
                parsedDate = new Date(lastValidDate);
                parsedDate.setDate(parsedDate.getDate() + 1);
            }
            else {
                continue;
            }
        }
        else {
            // Parse Excel serial date
            if (typeof dateValue === 'number') {
                var excelDate = xlsx_1.default.SSF.parse_date_code(dateValue);
                parsedDate = new Date(Date.UTC(excelDate.y, excelDate.m - 1, excelDate.d));
            }
            else if (typeof dateValue === 'string') {
                parsedDate = new Date(dateValue);
            }
            else if (dateValue instanceof Date) {
                parsedDate = dateValue;
            }
            if (!parsedDate || isNaN(parsedDate.getTime())) {
                continue;
            }
        }
        lastValidDate = parsedDate;
        var jValue = Number(row[jCol]) || 0;
        var aValue = Number(row[aCol]) || 0;
        var mValue = Number(row[mCol]) || 0;
        dataPoints.push({
            date: parsedDate.toISOString().split('T')[0],
            J: jValue,
            A: aValue,
            M: mValue,
        });
    }
    return dataPoints;
}
function parseBackupSheet(workbook) {
    var sheet = workbook.Sheets['backup'];
    if (!sheet) {
        console.warn('Sheet "backup" not found');
        return [];
    }
    var data = xlsx_1.default.utils.sheet_to_json(sheet, { header: 1 });
    var dataPoints = [];
    // Row 0: [2023, null, null, null, 2024, null, null, null, 2025]
    // Row 1: ["Date","J","A","M","Date","J","A","M","Date","J","A","M"]
    // Data starts at row 3
    if (data.length < 2)
        return [];
    var headerRow = data[1];
    // Find all "Date" column indices
    var dateColumns = [];
    for (var i = 0; i < headerRow.length; i++) {
        if (headerRow[i] === 'Date') {
            dateColumns.push(i);
        }
    }
    console.log("Backup sheet has ".concat(dateColumns.length, " date columns at indices:"), dateColumns);
    // Parse each year's data
    dateColumns.forEach(function (dateCol) {
        var lastValidDate = null;
        for (var i = 3; i < data.length; i++) {
            var row = data[i];
            if (!Array.isArray(row) || row.length === 0)
                continue;
            var dateValue = row[dateCol];
            var parsedDate = null;
            // Treat missing cells or cells with '###' as continuation of previous date
            if (!dateValue || String(dateValue).includes('#')) {
                if (lastValidDate) {
                    parsedDate = new Date(lastValidDate);
                    parsedDate.setDate(parsedDate.getDate() + 1);
                }
                else {
                    continue;
                }
            }
            else {
                if (typeof dateValue === 'number') {
                    var excelDate = xlsx_1.default.SSF.parse_date_code(dateValue);
                    parsedDate = new Date(Date.UTC(excelDate.y, excelDate.m - 1, excelDate.d));
                }
                else if (typeof dateValue === 'string') {
                    parsedDate = new Date(dateValue);
                }
                if (!parsedDate || isNaN(parsedDate.getTime())) {
                    continue;
                }
            }
            lastValidDate = parsedDate;
            var jValue = Number(row[dateCol + 1]) || 0;
            var aValue = Number(row[dateCol + 2]) || 0;
            var mValue = Number(row[dateCol + 3]) || 0;
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
function computeStatistics(dataPoints) {
    var persons = ['J', 'A', 'M'];
    var stats = {};
    if (dataPoints.length === 0) {
        persons.forEach(function (person) {
            stats[person] = {
                person: person,
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
    var firstDateOrig = new Date(dataPoints[0].date);
    var lastDateOrig = new Date(dataPoints[dataPoints.length - 1].date);
    var analysisStart = new Date(firstDateOrig.getFullYear(), firstDateOrig.getMonth(), 1);
    var capEnd = new Date(2025, 9, 19); // October 19, 2025 (month is 0-based)
    var analysisEnd = lastDateOrig > capEnd ? capEnd : lastDateOrig;
    // Use analysisEnd as the "now" reference so current week/month/year are relative to dataset end
    var now = new Date(analysisEnd);
    // Current month and week boundaries relative to analysisEnd
    var currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    var currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    var weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    var yearStartCandidate = new Date(now.getFullYear(), 0, 1);
    var yearStart = analysisStart > yearStartCandidate ? analysisStart : yearStartCandidate;
    // create map date -> {J,A,M}
    var map = {};
    dataPoints.forEach(function (d) {
        map[d.date] = { J: d.J, A: d.A, M: d.M };
    });
    // Build timeline from analysisStart to analysisEnd (inclusive)
    var timeline = [];
    for (var d = new Date(analysisStart); d <= analysisEnd; d.setDate(d.getDate() + 1)) {
        var iso = d.toISOString().split('T')[0];
        var entry = map[iso] || { J: 0, A: 0, M: 0 };
        timeline.push({ date: iso, J: entry.J, A: entry.A, M: entry.M });
    }
    // For each person compute metrics using timeline
    persons.forEach(function (person) {
        var personData = timeline.map(function (t) { return ({ date: t.date, count: t[person] }); });
        var currentWeek = personData
            .filter(function (d) {
            var date = new Date(d.date);
            return date >= weekStart && date <= now;
        })
            .reduce(function (sum, d) { return sum + d.count; }, 0);
        var currentMonth = personData
            .filter(function (d) {
            var date = new Date(d.date);
            return date >= currentMonthStart && date <= currentMonthEnd;
        })
            .reduce(function (sum, d) { return sum + d.count; }, 0);
        var yearTotal = personData
            .filter(function (d) {
            var date = new Date(d.date);
            return date >= yearStart && date <= now;
        })
            .reduce(function (sum, d) { return sum + d.count; }, 0);
        var totalDays = personData.length;
        var totalCount = personData.reduce(function (s, d) { return s + d.count; }, 0);
        var weeks = totalDays / 7;
        var months = totalDays / 30.436875;
        var weeklyAvg = weeks > 0 ? totalCount / weeks : 0;
        var monthlyAvg = months > 0 ? totalCount / months : 0;
        var peak = personData.reduce(function (max, d) { return d.count > max.count ? d : max; }, { date: '', count: -1 });
        var longestStreak = 0;
        var currentStreak = 0;
        var longestZeroStreak = 0;
        var currentZeroStreak = 0;
        personData.forEach(function (d) {
            if (d.count > 0) {
                currentStreak++;
                longestStreak = Math.max(longestStreak, currentStreak);
                currentZeroStreak = 0;
            }
            else {
                currentZeroStreak++;
                longestZeroStreak = Math.max(longestZeroStreak, currentZeroStreak);
                currentStreak = 0;
            }
        });
        var quietestPeriod = '';
        var minWeeklyTotal = Infinity;
        for (var i = 0; i <= personData.length - 7; i++) {
            var weekTotal = personData.slice(i, i + 7).reduce(function (sum, d) { return sum + d.count; }, 0);
            if (weekTotal < minWeeklyTotal) {
                minWeeklyTotal = weekTotal;
                quietestPeriod = personData[i].date;
            }
        }
        stats[person] = {
            person: person,
            currentWeek: currentWeek,
            currentMonth: currentMonth,
            yearTotal: yearTotal,
            weeklyAvg: weeklyAvg,
            monthlyAvg: monthlyAvg,
            peakDay: peak.date || timeline[0].date,
            peakDayCount: peak.count < 0 ? 0 : peak.count,
            longestStreak: longestStreak,
            longestZeroStreak: longestZeroStreak,
            quietestPeriod: quietestPeriod || timeline[0].date,
            totalDays: personData.filter(function (d) { return d.count > 0; }).length,
            totalCount: totalCount,
        };
    });
    return stats;
}
function generateInsights(dataPoints, stats) {
    var insights = [];
    // Find overall leader based on totalCount over the entire timeline
    var totals = {
        J: stats.J.totalCount,
        A: stats.A.totalCount,
        M: stats.M.totalCount,
    };
    var leader = Object.entries(totals).reduce(function (max, _a) {
        var person = _a[0], total = _a[1];
        return total > max.total ? { person: person, total: total } : max;
    }, { person: 'J', total: 0 });
    insights.push({
        type: 'comparison',
        title: "".concat(leader.person, " is the most active overall"),
        description: "With a total of ".concat(leader.total, " across the entire period"),
        metric: "".concat(leader.total, " total"),
        person: leader.person,
    });
    // Best streak
    var bestStreak = Object.entries(stats).reduce(function (max, _a) {
        var person = _a[0], stat = _a[1];
        return stat.longestStreak > max.streak ? { person: person, streak: stat.longestStreak } : max;
    }, { person: 'J', streak: 0 });
    insights.push({
        type: 'streak',
        title: "".concat(bestStreak.person, " has the longest streak"),
        description: "Maintained consistency for ".concat(bestStreak.streak, " consecutive days"),
        metric: "".concat(bestStreak.streak, " days"),
        person: bestStreak.person,
    });
    // Longest zero streak (quietest dry run)
    var bestZero = Object.entries(stats).reduce(function (max, _a) {
        var person = _a[0], stat = _a[1];
        return stat.longestZeroStreak > max.streak ? { person: person, streak: stat.longestZeroStreak } : max;
    }, { person: 'J', streak: 0 });
    if (bestZero.streak > 0) {
        insights.push({
            type: 'streak',
            title: "".concat(bestZero.person, " had the longest dry streak"),
            description: "A longest run of ".concat(bestZero.streak, " consecutive days with zero activity"),
            metric: "".concat(bestZero.streak, " days"),
            person: bestZero.person,
        });
    }
    // Peak performer this month
    var monthlyLeader = Object.entries(stats).reduce(function (max, _a) {
        var person = _a[0], stat = _a[1];
        return stat.currentMonth > max.count ? { person: person, count: stat.currentMonth } : max;
    }, { person: 'J', count: 0 });
    insights.push({
        type: 'peak',
        title: "".concat(monthlyLeader.person, " is leading this month"),
        description: "Most active in the current month with ".concat(monthlyLeader.count, " total"),
        metric: "".concat(monthlyLeader.count, " this month"),
        person: monthlyLeader.person,
    });
    // Day of week pattern
    var dayOfWeekCounts = {};
    dataPoints.forEach(function (d) {
        var dayName = new Date(d.date).toLocaleDateString('en-US', { weekday: 'long' });
        var total = d.J + d.A + d.M;
        dayOfWeekCounts[dayName] = (dayOfWeekCounts[dayName] || 0) + total;
    });
    var peakDayOfWeek = Object.entries(dayOfWeekCounts).reduce(function (max, _a) {
        var day = _a[0], count = _a[1];
        return count > max.count ? { day: day, count: count } : max;
    }, { day: '', count: 0 });
    insights.push({
        type: 'pattern',
        title: "".concat(peakDayOfWeek.day, "s are the most active"),
        description: "Overall activity peaks on ".concat(peakDayOfWeek.day, "s across all individuals"),
        metric: "".concat(peakDayOfWeek.count, " total"),
    });
    // Recent trend
    var last7Days = dataPoints.slice(-7);
    var prev7Days = dataPoints.slice(-14, -7);
    var recentTotal = last7Days.reduce(function (sum, d) { return sum + d.J + d.A + d.M; }, 0);
    var previousTotal = prev7Days.reduce(function (sum, d) { return sum + d.J + d.A + d.M; }, 0);
    var change = recentTotal - previousTotal;
    if (Math.abs(change) > 5) {
        insights.push({
            type: change > 0 ? 'pattern' : 'anomaly',
            title: change > 0 ? 'Activity increasing recently' : 'Activity decreasing recently',
            description: "Overall activity ".concat(change > 0 ? 'increased' : 'decreased', " by ").concat(Math.abs(change), " in the last week compared to the previous week"),
            metric: "".concat(change > 0 ? '+' : '').concat(change),
        });
    }
    return insights;
}
