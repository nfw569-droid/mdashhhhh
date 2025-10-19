import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { parseExcelFile } from "./excel-parser";

export async function registerRoutes(app: Express): Promise<Server> {
  // Parse Excel file on startup
  console.log('Parsing Excel file...');
  try {
    const parsedData = await parseExcelFile();
    await storage.setParsedData(parsedData);
    console.log(`Successfully parsed ${parsedData.dataPoints.length} data points`);
  } catch (error) {
    console.error('Failed to parse Excel file:', error);
    throw error;
  }

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

  const httpServer = createServer(app);

  return httpServer;
}
