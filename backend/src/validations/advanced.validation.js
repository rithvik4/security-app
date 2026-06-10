import { z } from "zod";

const baseEnvelope = {
  query: z.object({}).default({}),
  params: z.object({}).default({}),
};

const idParam = z.object({ id: z.string().regex(/^\d+$/) });

export const residentDirectorySchema = z.object({
  body: z.object({}).default({}),
  query: z.object({
    q: z.string().optional(),
    block: z.string().optional(),
    flatNumber: z.string().optional(),
  }).default({}),
  params: z.object({}).default({}),
});

export const verifyResidentSchema = z.object({
  body: z.object({
    flatId: z.number().int().positive(),
    identifier: z.string().min(3),
  }),
  ...baseEnvelope,
});

export const createDeliverySchema = z.object({
  body: z.object({
    flatId: z.number().int().positive(),
    courierName: z.string().min(2),
    contactNumber: z.string().min(8).max(15).optional(),
    packageType: z.string().max(80).optional(),
    expectedAt: z.string().datetime().optional(),
  }),
  ...baseEnvelope,
});

export const listDeliveriesSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    status: z.enum(["EXPECTED", "ARRIVED", "COLLECTED", "CANCELLED"]).optional(),
    flatId: z.string().regex(/^\d+$/).optional(),
  }).default({}),
});

export const updateDeliveryStatusSchema = z.object({
  body: z.object({
    status: z.enum(["ARRIVED", "COLLECTED", "CANCELLED"]),
  }),
  params: idParam,
  query: z.object({}).default({}),
});

export const registerVehicleSchema = z.object({
  body: z.object({
    plateNumber: z.string().min(5).max(20),
    type: z.string().min(2).max(40),
    brand: z.string().max(40).optional(),
    color: z.string().max(30).optional(),
  }),
  ...baseEnvelope,
});

export const listVehiclesSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    status: z.enum(["ACTIVE", "BLOCKED"]).optional(),
    flatId: z.string().regex(/^\d+$/).optional(),
    q: z.string().optional(),
  }).default({}),
});

export const updateVehicleStatusSchema = z.object({
  body: z.object({
    status: z.enum(["ACTIVE", "BLOCKED"]),
  }),
  params: idParam,
  query: z.object({}).default({}),
});

export const createEmergencyAlertSchema = z.object({
  body: z.object({
    level: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    message: z.string().min(4).max(300),
    flatId: z.number().int().positive().optional(),
  }),
  ...baseEnvelope,
});

export const listEmergencyAlertsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]).optional(),
    level: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  }).default({}),
});

export const acknowledgeEmergencyAlertSchema = z.object({
  body: z.object({
    status: z.enum(["ACKNOWLEDGED", "RESOLVED"]),
  }),
  params: idParam,
  query: z.object({}).default({}),
});

export const createMaintenanceInvoiceSchema = z.object({
  body: z.object({
    flatId: z.number().int().positive(),
    amount: z.number().positive(),
    dueDate: z.string().datetime(),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2020).max(2100),
    notes: z.string().max(400).optional(),
  }),
  ...baseEnvelope,
});

export const listMaintenanceInvoicesSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    status: z.enum(["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE"]).optional(),
    month: z.string().regex(/^\d+$/).optional(),
    year: z.string().regex(/^\d+$/).optional(),
    flatId: z.string().regex(/^\d+$/).optional(),
  }).default({}),
});

export const recordMaintenancePaymentSchema = z.object({
  body: z.object({
    amount: z.number().positive(),
    method: z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER"]),
    reference: z.string().max(100).optional(),
  }),
  params: idParam,
  query: z.object({}).default({}),
});

export const createComplaintSchema = z.object({
  body: z.object({
    flatId: z.number().int().positive().optional(),
    category: z.string().min(2).max(60),
    subject: z.string().min(3).max(100),
    description: z.string().min(5).max(1000),
  }),
  ...baseEnvelope,
});

export const listComplaintsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
    category: z.string().optional(),
    flatId: z.string().regex(/^\d+$/).optional(),
  }).default({}),
});

export const updateComplaintStatusSchema = z.object({
  body: z.object({
    status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
    assignedToId: z.number().int().positive().optional(),
  }),
  params: idParam,
  query: z.object({}).default({}),
});

export const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(120),
    message: z.string().min(5).max(2000),
    audienceRole: z.enum(["ADMIN", "SECURITY", "MEMBER"]).optional(),
  }),
  ...baseEnvelope,
});

export const listAuditLogsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    module: z.string().optional(),
    actorId: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }).default({}),
});
