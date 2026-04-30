import { z } from "zod";

export const createVisitorEntrySchema = z.object({
  body: z.object({
    visitorName: z.string().min(2),
    phone: z.string().min(8).max(15).optional(),
    flatId: z.number().int().positive(),
    peopleCount: z.number().int().positive().max(20),
    vehicleNumber: z.string().max(30).optional(),
    purpose: z.string().max(200).optional(),
  }),
  query: z.object({}).default({}),
  params: z.object({}).default({}),
});

export const markExitSchema = z.object({
  body: z.object({}).default({}),
  query: z.object({}).default({}),
  params: z.object({ logId: z.string().regex(/^\d+$/) }),
});
