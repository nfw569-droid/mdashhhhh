import type { ParsedData } from "@shared/schema";

export interface IStorage {
  getParsedData(): Promise<ParsedData | undefined>;
  setParsedData(data: ParsedData): Promise<void>;
}

export class MemStorage implements IStorage {
  private parsedData: ParsedData | undefined;

  constructor() {
    this.parsedData = undefined;
  }

  async getParsedData(): Promise<ParsedData | undefined> {
    return this.parsedData;
  }

  async setParsedData(data: ParsedData): Promise<void> {
    this.parsedData = data;
  }
}

export const storage = new MemStorage();
