import { Role } from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { writeAuditLog } from "../utils/audit.js";
import { catchAsync } from "../utils/catchAsync.js";

// ─── Amenities (admin CRUD) ───────────────────────────────────────────────────

export const createAmenity = catchAsync(async (req, res, next) => {
  if (req.user.role !== Role.ADMIN) return next(new ApiError(403, "Forbidden"));
  const { name, description, capacity } = req.body;

  const amenity = await prisma.amenity.create({
    data: { name, description, capacity: capacity || 1 },
  });

  res.status(201).json(amenity);
});

export const listAmenities = catchAsync(async (_req, res) => {
  const amenities = await prisma.amenity.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  res.json(amenities);
});

export const updateAmenity = catchAsync(async (req, res, next) => {
  if (req.user.role !== Role.ADMIN) return next(new ApiError(403, "Forbidden"));
  const id = Number(req.params.id);
  const amenity = await prisma.amenity.update({ where: { id }, data: req.body });
  res.json(amenity);
});

// ─── Amenity Bookings ─────────────────────────────────────────────────────────

export const createBooking = catchAsync(async (req, res, next) => {
  if (req.user.role !== Role.MEMBER) return next(new ApiError(403, "Only members can book amenities"));
  if (!req.user.flatId) return next(new ApiError(400, "No flat mapped"));

  const { amenityId, date, startTime, endTime, notes } = req.body;

  const amenity = await prisma.amenity.findUnique({ where: { id: amenityId } });
  if (!amenity || !amenity.isActive) return next(new ApiError(404, "Amenity not found or inactive"));

  // Check for conflicting bookings
  const conflict = await prisma.amenityBooking.findFirst({
    where: {
      amenityId,
      date: new Date(date),
      status: { in: ["PENDING", "CONFIRMED"] },
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    },
  });

  if (conflict) {
    const existing = await prisma.amenityBooking.count({
      where: { amenityId, date: new Date(date), status: { in: ["PENDING", "CONFIRMED"] } },
    });
    if (existing >= amenity.capacity) {
      return next(new ApiError(409, "Slot unavailable — amenity is fully booked at this time"));
    }
  }

  const booking = await prisma.amenityBooking.create({
    data: {
      amenityId,
      userId: req.user.id,
      flatId: req.user.flatId,
      date: new Date(date),
      startTime,
      endTime,
      notes,
    },
    include: {
      amenity: true,
      user: { select: { id: true, name: true } },
      flat: true,
    },
  });

  await writeAuditLog({ actorId: req.user.id, action: "CREATE", module: "AMENITY", entityType: "AmenityBooking", entityId: booking.id, metadata: { amenityId, date } });
  res.status(201).json(booking);
});

export const listBookings = catchAsync(async (req, res) => {
  const { amenityId, status, date } = req.query;

  const where = {
    amenityId: amenityId ? Number(amenityId) : undefined,
    status: status || undefined,
    date: date ? new Date(date) : undefined,
    userId: req.user.role === Role.MEMBER ? req.user.id : undefined,
  };

  const bookings = await prisma.amenityBooking.findMany({
    where,
    include: {
      amenity: true,
      user: { select: { id: true, name: true } },
      flat: true,
    },
    orderBy: [{ date: "desc" }, { startTime: "asc" }],
  });

  res.json(bookings);
});

export const updateBookingStatus = catchAsync(async (req, res, next) => {
  const id = Number(req.params.id);
  const { status } = req.body;

  const booking = await prisma.amenityBooking.findUnique({ where: { id } });
  if (!booking) return next(new ApiError(404, "Booking not found"));

  // Members can only cancel their own bookings
  if (req.user.role === Role.MEMBER) {
    if (booking.userId !== req.user.id || status !== "CANCELLED") {
      return next(new ApiError(403, "Forbidden"));
    }
  }

  const updated = await prisma.amenityBooking.update({
    where: { id },
    data: { status },
    include: { amenity: true, user: { select: { id: true, name: true } }, flat: true },
  });

  await writeAuditLog({ actorId: req.user.id, action: "UPDATE_STATUS", module: "AMENITY", entityType: "AmenityBooking", entityId: id, metadata: { status } });
  res.json(updated);
});
