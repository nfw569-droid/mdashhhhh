import { z } from "zod";

// Data point for a single day
export const dataPointSchema = z.object({
  date: z.string(), // ISO date string
  J: z.number(),
  A: z.number(),
  M: z.number(),
});

export type DataPoint = z.infer<typeof dataPointSchema>;

// Statistics for a person
export const personStatsSchema = z.object({
  person: z.enum(["J", "A", "M"]),
  currentWeek: z.number(),
  currentMonth: z.number(),
  yearTotal: z.number(),
  weeklyAvg: z.number(),
  monthlyAvg: z.number(),
  peakDay: z.string(),
  peakDayCount: z.number(),
  longestStreak: z.number(),
  quietestPeriod: z.string(),
  totalDays: z.number(),
});

export type PersonStats = z.infer<typeof personStatsSchema>;

// Insight about patterns
export const insightSchema = z.object({
  type: z.enum(["peak", "streak", "comparison", "pattern", "anomaly"]),
  title: z.string(),
  description: z.string(),
  metric: z.string().optional(),
  person: z.enum(["J", "A", "M"]).optional(),
});

export type Insight = z.infer<typeof insightSchema>;

// Complete parsed data response
export const parsedDataSchema = z.object({
  dataPoints: z.array(dataPointSchema),
  stats: z.object({
    J: personStatsSchema,
    A: personStatsSchema,
    M: personStatsSchema,
  }),
  insights: z.array(insightSchema),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
});

export type ParsedData = z.infer<typeof parsedDataSchema>;
