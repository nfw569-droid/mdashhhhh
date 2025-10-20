(async () => {
    try {
        const p = await import('../server/excel-parser');
        const parsed = await p.parseExcelFile();

        console.log('\n--- Parse summary ---');
        console.log('Data points:', parsed.dataPoints.length);
        console.log('Date range:', parsed.dateRange);

        console.log('\n--- Person stats (J / A / M) ---');
        console.log('J:', JSON.stringify(parsed.stats.J, null, 2));
        console.log('A:', JSON.stringify(parsed.stats.A, null, 2));
        console.log('M:', JSON.stringify(parsed.stats.M, null, 2));

        console.log('\n--- Top insights ---');
        parsed.insights.slice(0, 12).forEach((insight: any, idx: number) => {
            console.log(`${idx + 1}. [${insight.type}] ${insight.title} — ${insight.description} ${insight.metric ? '(' + insight.metric + ')' : ''}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Error running parse:', err && err.stack ? err.stack : err);
        process.exit(1);
    }
})();
