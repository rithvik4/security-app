import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(3),
    password: z.string().min(6),
  }),
  query: z.object({}).default({}),
  params: z.object({}).default({}),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(10),
  }),
  query: z.object({}).default({}),
  params: z.object({}).default({}),
});

export const logoutSchema = refreshSchema;
