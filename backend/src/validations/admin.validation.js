import { z } from "zod";

const baseEnvelope = {
  query: z.object({}).default({}),
  params: z.object({}).default({}),
};

export const createFlatSchema = z.object({
  body: z.object({
    block: z.string().min(1),
    flatNumber: z.string().min(1),
  }),
  ...baseEnvelope,
});

export const createFlatWithMembersSchema = z.object({
  body: z.object({
    block: z.string().min(1),
    flatNumber: z.string().min(1),
    members: z.array(
      z.object({
        name: z.string().min(2),
        email: z.string().email().optional(),
        phone: z.string().min(8).max(15).optional(),
        password: z.string().min(6),
        isOwner: z.boolean().optional(),
      }).refine((data) => data.email || data.phone, {
        message: "Either email or phone is required",
        path: ["email"],
      })
    ).min(1),
  }),
  ...baseEnvelope,
});

export const updateFlatSchema = z.object({
  body: z.object({
    block: z.string().min(1).optional(),
    flatNumber: z.string().min(1).optional(),
  }),
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  query: z.object({}).default({}),
});

export const userIdParamSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  query: z.object({}).default({}),
});

export const createMemberSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email().optional(),
    phone: z.string().min(8).max(15).optional(),
    password: z.string().min(6),
    flatId: z.number().int().positive(),
    isOwner: z.boolean().optional(),
  }).refine((data) => data.email || data.phone, {
    message: "Either email or phone is required",
    path: ["email"],
  }),
  ...baseEnvelope,
});

export const updateMemberSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(8).max(15).optional(),
    flatId: z.number().int().positive().optional(),
    isOwner: z.boolean().optional(),
    password: z.string().min(6).optional(),
  }),
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  query: z.object({ q: z.string().optional() }).default({}),
});

export const createSecuritySchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email().optional(),
    phone: z.string().min(8).max(15).optional(),
    password: z.string().min(6),
  }).refine((data) => data.email || data.phone, {
    message: "Either email or phone is required",
    path: ["email"],
  }),
  ...baseEnvelope,
});

export const updateSecuritySchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(8).max(15).optional(),
    password: z.string().min(6).optional(),
  }),
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  query: z.object({}).default({}),
});

export const logFilterSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    block: z.string().optional(),
    flatNumber: z.string().optional(),
    enteredBy: z.string().regex(/^\d+$/).optional(),
    status: z.enum(["ENTERED", "EXITED", "REJECTED"]).optional(),
  }),
});
