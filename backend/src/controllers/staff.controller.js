import crypto from "crypto";
import { Role } from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { writeAuditLog } from "../utils/audit.js";
import { catchAsync } from "../utils/catchAsync.js";

// ─── Frequent Visitors ───────────────────────────────────────────────────────

export const addFrequentVisitor = catchAsync(async (req, res, next) => {
  if (req.user.role !== Role.MEMBER) return next(new ApiError(403, "Forbidden"));
  if (!req.user.flatId) return next(new ApiError(400, "No flat mapped"));

  const { name, phone, category } = req.body;

  const fv = await prisma.frequentVisitor.create({
    data: { flatId: req.user.flatId, addedById: req.user.id, name, phone, category },
    include: { flat: true, addedBy: { select: { id: true, name: true } } },
  });

  await writeAuditLog({ actorId: req.user.id, action: "CREATE", module: "STAFF", entityType: "FrequentVisitor", entityId: fv.id, metadata: { name, category } });
  res.status(201).json(fv);
});

export const listFrequentVisitors = catchAsync(async (req, res) => {
  const { flatId, category, isActive } = req.query;

  const where = {
    flatId: flatId ? Number(flatId) : (req.user.role === Role.MEMBER ? req.user.flatId : undefined),
    category: category || undefined,
    isActive: isActive === "false" ? false : isActive === "true" ? true : undefined,
  };

  const visitors = await prisma.frequentVisitor.findMany({
    where,
    include: {
      flat: true,
      addedBy: { select: { id: true, name: true } },
      attendances: {
        orderBy: { checkedInAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(visitors);
});

export const updateFrequentVisitor = catchAsync(async (req, res, next) => {
  const id = Number(req.params.id);
  const fv = await prisma.frequentVisitor.findUnique({ where: { id } });
  if (!fv) return next(new ApiError(404, "Frequent visitor not found"));

  if (req.user.role === Role.MEMBER && fv.flatId !== req.user.flatId) {
    return next(new ApiError(403, "Forbidden"));
  }

  const updated = await prisma.frequentVisitor.update({
    where: { id },
    data: req.body,
    include: { flat: true },
  });

  res.json(updated);
});

// ─── Staff Attendance ────────────────────────────────────────────────────────

export const staffCheckIn = catchAsync(async (req, res, next) => {
  const { frequentVisitorId } = req.body;

  const fv = await prisma.frequentVisitor.findUnique({ where: { id: frequentVisitorId } });
  if (!fv || !fv.isActive) return next(new ApiError(404, "Frequent visitor not found or inactive"));

  const existing = await prisma.staffAttendance.findFirst({
    where: { frequentVisitorId, checkedOutAt: null },
  });
  if (existing) return next(new ApiError(400, "Staff is already checked in"));

  const record = await prisma.staffAttendance.create({
    data: { frequentVisitorId, markedById: req.user.id },
    include: {
      frequentVisitor: { include: { flat: true } },
      markedBy: { select: { id: true, name: true, role: true } },
    },
  });

  res.status(201).json(record);
});

export const staffCheckOut = catchAsync(async (req, res, next) => {
  const { frequentVisitorId } = req.body;

  const record = await prisma.staffAttendance.findFirst({
    where: { frequentVisitorId, checkedOutAt: null },
    orderBy: { checkedInAt: "desc" },
  });
  if (!record) return next(new ApiError(404, "No active check-in found"));

  const updated = await prisma.staffAttendance.update({
    where: { id: record.id },
    data: { checkedOutAt: new Date(), markedById: req.user.id },
    include: {
      frequentVisitor: { include: { flat: true } },
      markedBy: { select: { id: true, name: true, role: true } },
    },
  });

  res.json(updated);
});

export const listStaffAttendance = catchAsync(async (req, res) => {
  const { frequentVisitorId, flatId } = req.query;

  const where = {
    frequentVisitorId: frequentVisitorId ? Number(frequentVisitorId) : undefined,
    frequentVisitor: flatId ? { flatId: Number(flatId) } : (req.user.role === Role.MEMBER ? { flatId: req.user.flatId } : undefined),
  };

  const records = await prisma.staffAttendance.findMany({
    where,
    include: {
      frequentVisitor: { include: { flat: true } },
      markedBy: { select: { id: true, name: true, role: true } },
    },
    orderBy: { checkedInAt: "desc" },
    take: 100,
  });

  res.json(records);
});

// ─── Visitor OTP Invites ─────────────────────────────────────────────────────

export const createVisitorInvite = catchAsync(async (req, res, next) => {
  if (req.user.role !== Role.MEMBER) return next(new ApiError(403, "Forbidden"));
  if (!req.user.flatId) return next(new ApiError(400, "No flat mapped"));

  const { guestName, guestPhone, purpose, validFrom, validUntil } = req.body;
  const otp = String(crypto.randomInt(100000, 999999));

  const invite = await prisma.visitorInvite.create({
    data: {
      flatId: req.user.flatId,
      createdById: req.user.id,
      guestName,
      guestPhone,
      purpose,
      otp,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
    },
    include: {
      flat: true,
      createdBy: { select: { id: true, name: true } },
    },
  });

  await writeAuditLog({ actorId: req.user.id, action: "CREATE", module: "INVITE", entityType: "VisitorInvite", entityId: invite.id, metadata: { guestName, otp } });
  res.status(201).json(invite);
});

export const listVisitorInvites = catchAsync(async (req, res) => {
  const where = req.user.role === Role.MEMBER
    ? { flatId: req.user.flatId }
    : {};

  const invites = await prisma.visitorInvite.findMany({
    where,
    include: {
      flat: true,
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(invites);
});

export const verifyInviteOtp = catchAsync(async (req, res, next) => {
  const { otp } = req.body;
  const now = new Date();

  const invite = await prisma.visitorInvite.findFirst({
    where: {
      otp,
      usedAt: null,
      validFrom: { lte: now },
      validUntil: { gte: now },
    },
    include: { flat: true, createdBy: { select: { id: true, name: true } } },
  });

  if (!invite) return next(new ApiError(404, "Invalid or expired OTP"));

  const watchlistHits = await prisma.watchlistEntry.findMany({
    where: {
      isActive: true,
      OR: [
        invite.guestPhone ? { type: "VISITOR_PHONE", value: invite.guestPhone } : undefined,
        { type: "PERSON_NAME", value: invite.guestName },
      ].filter(Boolean),
    },
  });

  if (watchlistHits.length > 0) {
    return next(new ApiError(403, "Invite verification blocked: guest is watchlisted"));
  }

  // Mark invite as used and auto-create visitor entry
  const [updatedInvite, visitorLog] = await prisma.$transaction(async (tx) => {
    const updated = await tx.visitorInvite.update({
      where: { id: invite.id },
      data: { usedAt: now },
      include: { flat: true },
    });

    const visitor = await tx.visitor.create({
      data: { name: invite.guestName, phone: invite.guestPhone || undefined },
    });

    const log = await tx.visitorLog.create({
      data: {
        visitorId: visitor.id,
        flatId: invite.flatId,
        enteredBy: req.user.id,
        purpose: invite.purpose || "OTP Invite",
        status: "ENTERED",
      },
      include: { visitor: true, flat: true },
    });

    return [updated, log];
  });

  await writeAuditLog({ actorId: req.user.id, action: "VERIFY_OTP", module: "INVITE", entityType: "VisitorInvite", entityId: invite.id, metadata: { guestName: invite.guestName } });
  res.json({ invite: updatedInvite, visitorLog });
});
