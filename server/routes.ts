import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { parseExcelFile } from "./excel-parser";

export async function registerRoutes(app: Express): Promise<Server> {
  // Parse Excel file on startup (fetch from Google Sheets)
  console.log('Fetching and parsing Google Sheet on startup...');
  try {
    const parsedData = await parseExcelFile();
    await storage.setParsedData(parsedData);
    console.log(`Successfully parsed ${parsedData.dataPoints.length} data points`);
  } catch (error) {
    console.error('Failed to fetch/parse Google Sheet on startup:', error);
    // do not throw: allow server to start and attempt refresh later
  }

  // Schedule periodic refresh every 12 hours
  const twelveHoursMs = 12 * 60 * 60 * 1000;
  let refreshTimer: NodeJS.Timeout | null = null;
  let lastRefresh = new Date();
  let nextRefresh = new Date(Date.now() + twelveHoursMs);

  async function doRefresh() {
    console.log('Scheduled refresh: fetching Google Sheet...');
    try {
      const parsedData = await parseExcelFile();
      await storage.setParsedData(parsedData);
      lastRefresh = new Date();
      nextRefresh = new Date(Date.now() + twelveHoursMs);
      console.log(`Refresh successful: ${parsedData.dataPoints.length} data points`);
      console.log(`Next refresh scheduled for: ${nextRefresh.toLocaleString()}`);
    } catch (err) {
      console.error('Scheduled refresh failed:', err);
    }
  }

  // start first scheduled run 12 hours from now to avoid double-run on some deploys
  refreshTimer = setInterval(doRefresh, twelveHoursMs);
  console.log(`Initial refresh done. Next refresh scheduled for: ${nextRefresh.toLocaleString()}`);

  // Clean up interval on server shutdown
  process.on('SIGTERM', () => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      console.log('Cleared refresh timer on shutdown');
    }
  });

  // Expose endpoint to trigger manual refresh
  app.post('/api/refresh', async (req, res) => {
    try {
      const parsedData = await parseExcelFile();
      await storage.setParsedData(parsedData);
      return res.json({ ok: true, count: parsedData.dataPoints.length });
    } catch (err) {
      console.error('Manual refresh failed:', err);
      return res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // GET endpoint to retrieve parsed data
  app.get('/api/data', async (req, res) => {
    try {
      const data = await storage.getParsedData();
      if (!data) {
        return res.status(404).json({ error: 'No data available' });
      }
      res.json(data);
    } catch (error) {
      console.error('Error retrieving data:', error);
      res.status(500).json({ error: 'Failed to retrieve data' });
    }
  });

  // GET endpoint to check refresh status
  app.get('/api/refresh/status', (req, res) => {
    res.json({
      lastRefresh: lastRefresh.toISOString(),
      nextRefresh: nextRefresh.toISOString(),
      timeUntilNextRefresh: nextRefresh.getTime() - Date.now(),
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
