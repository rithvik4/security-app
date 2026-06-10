import { z } from "zod";

const base = {
  query: z.object({}).default({}),
  params: z.object({}).default({}),
};
const idParam = z.object({ id: z.string().regex(/^\d+$/) });

// ─── Frequent Visitors ────────────────────────────────────────────────────────

export const addFrequentVisitorSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80),
    phone: z.string().min(8).max(15).optional(),
    category: z.enum(["MAID", "DRIVER", "COOK", "SECURITY_GUARD", "PLUMBER", "ELECTRICIAN", "MILKMAN", "NEWSPAPER", "OTHER"]),
  }),
  ...base,
});

export const listFrequentVisitorsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    flatId: z.string().regex(/^\d+$/).optional(),
    category: z.enum(["MAID", "DRIVER", "COOK", "SECURITY_GUARD", "PLUMBER", "ELECTRICIAN", "MILKMAN", "NEWSPAPER", "OTHER"]).optional(),
    isActive: z.string().optional(),
  }).default({}),
});

export const updateFrequentVisitorSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80).optional(),
    phone: z.string().min(8).max(15).optional(),
    category: z.enum(["MAID", "DRIVER", "COOK", "SECURITY_GUARD", "PLUMBER", "ELECTRICIAN", "MILKMAN", "NEWSPAPER", "OTHER"]).optional(),
    isActive: z.boolean().optional(),
  }),
  params: idParam,
  query: z.object({}).default({}),
});

// ─── Staff Attendance ─────────────────────────────────────────────────────────

export const staffCheckInSchema = z.object({
  body: z.object({ frequentVisitorId: z.number().int().positive() }),
  ...base,
});

export const listAttendanceSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    frequentVisitorId: z.string().regex(/^\d+$/).optional(),
    flatId: z.string().regex(/^\d+$/).optional(),
  }).default({}),
});

// ─── Visitor OTP Invites ──────────────────────────────────────────────────────

export const createInviteSchema = z.object({
  body: z.object({
    guestName: z.string().min(2).max(80),
    guestPhone: z.string().min(8).max(15).optional(),
    purpose: z.string().max(200).optional(),
    validFrom: z.string().datetime(),
    validUntil: z.string().datetime(),
  }),
  ...base,
});

export const verifyOtpSchema = z.object({
  body: z.object({ otp: z.string().length(6) }),
  ...base,
});

// ─── Amenities ────────────────────────────────────────────────────────────────

export const createAmenitySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80),
    description: z.string().max(300).optional(),
    capacity: z.number().int().positive().default(1),
  }),
  ...base,
});

export const updateAmenitySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80).optional(),
    description: z.string().max(300).optional(),
    capacity: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
  }),
  params: idParam,
  query: z.object({}).default({}),
});

export const createBookingSchema = z.object({
  body: z.object({
    amenityId: z.number().int().positive(),
    date: z.string().datetime(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    notes: z.string().max(200).optional(),
  }),
  ...base,
});

export const listBookingsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    amenityId: z.string().regex(/^\d+$/).optional(),
    status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
    date: z.string().datetime().optional(),
  }).default({}),
});

export const updateBookingStatusSchema = z.object({
  body: z.object({ status: z.enum(["CONFIRMED", "CANCELLED"]) }),
  params: idParam,
  query: z.object({}).default({}),
});

// ─── Polls ────────────────────────────────────────────────────────────────────

export const createPollSchema = z.object({
  body: z.object({
    question: z.string().min(5).max(300),
    description: z.string().max(600).optional(),
    closesAt: z.string().datetime(),
    options: z.array(z.string().min(1).max(100)).min(2).max(10),
  }),
  ...base,
});

export const voteSchema = z.object({
  body: z.object({ optionId: z.number().int().positive() }),
  params: idParam,
  query: z.object({}).default({}),
});

// ─── Parking ──────────────────────────────────────────────────────────────────

export const createParkingSlotSchema = z.object({
  body: z.object({
    slotNumber: z.string().min(1).max(20),
    type: z.enum(["CAR", "BIKE", "VISITOR", "RESERVED"]),
    block: z.string().optional(),
  }),
  ...base,
});

export const listParkingSlotsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    type: z.enum(["CAR", "BIKE", "VISITOR", "RESERVED"]).optional(),
    block: z.string().optional(),
    available: z.string().optional(),
  }).default({}),
});

export const allocateParkingSchema = z.object({
  body: z.object({
    vehicleNo: z.string().min(4).max(20),
    purpose: z.enum(["RESIDENT", "VISITOR", "DELIVERY", "OTHER"]),
    flatId: z.number().int().positive().optional(),
  }),
  params: idParam,
  query: z.object({}).default({}),
});

export const listAllocationsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({ active: z.string().optional() }).default({}),
});
