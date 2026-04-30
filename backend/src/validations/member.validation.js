import { z } from "zod";

export const decisionSchema = z.object({
  body: z.object({
    action: z.enum(["approve", "reject"]),
  }),
  query: z.object({}).default({}),
  params: z.object({ logId: z.string().regex(/^\d+$/) }),
});
