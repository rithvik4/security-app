import crypto from "crypto";
import { Role } from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { writeAuditLog } from "../utils/audit.js";
import { catchAsync } from "../utils/catchAsync.js";

export const createWatchlistEntry = catchAsync(async (req, res, next) => {
  if (![Role.ADMIN, Role.SECURITY].includes(req.user.role)) {
    return next(new ApiError(403, "Forbidden"));
  }

  const { type, value, reason, severity } = req.body;
  const entry = await prisma.watchlistEntry.create({
    data: {
      type,
      value: value.trim(),
      reason,
      severity: severity || "HIGH",
      createdById: req.user.id,
    },
    include: { createdBy: { select: { id: true, name: true, role: true } } },
  });

  await writeAuditLog({
    actorId: req.user.id,
    action: "CREATE",
    module: "WATCHLIST",
    entityType: "WatchlistEntry",
    entityId: entry.id,
    metadata: { type, value },
  });

  res.status(201).json(entry);
});

export const listWatchlistEntries = catchAsync(async (req, res) => {
  const { type, isActive, q } = req.query;

  const entries = await prisma.watchlistEntry.findMany({
    where: {
      type: type || undefined,
      isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
      value: q ? { contains: q, mode: "insensitive" } : undefined,
    },
    include: { createdBy: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.json(entries);
});

export const updateWatchlistEntry = catchAsync(async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.watchlistEntry.update({
    where: { id },
    data: req.body,
    include: { createdBy: { select: { id: true, name: true, role: true } } },
  });

  await writeAuditLog({
    actorId: req.user.id,
    action: "UPDATE",
    module: "WATCHLIST",
    entityType: "WatchlistEntry",
    entityId: id,
    metadata: req.body,
  });

  res.json(updated);
});

export const generateDeliveryPin = catchAsync(async (req, res, next) => {
  const id = Number(req.params.id);
  const delivery = await prisma.delivery.findUnique({ where: { id } });
  if (!delivery) return next(new ApiError(404, "Delivery not found"));

  if (![Role.ADMIN, Role.SECURITY].includes(req.user.role)) {
    return next(new ApiError(403, "Forbidden"));
  }

  const pin = String(crypto.randomInt(1000, 9999));
  const updated = await prisma.delivery.update({
    where: { id },
    data: { handoverPin: pin },
    include: { flat: true, createdBy: { select: { id: true, name: true } } },
  });

  await writeAuditLog({
    actorId: req.user.id,
    action: "GENERATE_PIN",
    module: "DELIVERY",
    entityType: "Delivery",
    entityId: id,
    metadata: { flatId: updated.flatId },
  });

  res.json({ id: updated.id, handoverPin: pin, status: updated.status });
});

export const verifyDeliveryPin = catchAsync(async (req, res, next) => {
  const id = Number(req.params.id);
  const { pin } = req.body;

  const delivery = await prisma.delivery.findUnique({ where: { id } });
  if (!delivery) return next(new ApiError(404, "Delivery not found"));

  if (req.user.role === Role.MEMBER && req.user.flatId !== delivery.flatId) {
    return next(new ApiError(403, "Forbidden"));
  }

  if (!delivery.handoverPin || delivery.handoverPin !== pin) {
    return next(new ApiError(400, "Invalid delivery handover PIN"));
  }

  const updated = await prisma.delivery.update({
    where: { id },
    data: {
      status: "COLLECTED",
      receivedAt: new Date(),
      receivedById: req.user.id,
      handoverVerifiedAt: new Date(),
      handoverPin: null,
    },
    include: {
      flat: true,
      createdBy: { select: { id: true, name: true, role: true } },
      receivedBy: { select: { id: true, name: true, role: true } },
    },
  });

  await writeAuditLog({
    actorId: req.user.id,
    action: "VERIFY_PIN",
    module: "DELIVERY",
    entityType: "Delivery",
    entityId: id,
    metadata: { status: "COLLECTED" },
  });

  res.json(updated);
});

export const runMaintenanceReminders = catchAsync(async (req, res, next) => {
  if (req.user.role !== Role.ADMIN) return next(new ApiError(403, "Forbidden"));

  const { channel = "PUSH" } = req.body;
  const now = new Date();
  const threshold = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const invoices = await prisma.maintenanceInvoice.findMany({
    where: {
      status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
      dueDate: { lte: threshold },
    },
    include: { flat: true },
  });

  const reminders = await prisma.$transaction(
    invoices.map((invoice) =>
      prisma.paymentReminder.create({
        data: {
          invoiceId: invoice.id,
          sentById: req.user.id,
          channel,
          message: `Maintenance due for ${invoice.flat.block}-${invoice.flat.flatNumber}. Amount: INR ${invoice.amount}. Due: ${invoice.dueDate.toISOString().slice(0, 10)}`,
        },
        include: {
          invoice: { include: { flat: true } },
          sentBy: { select: { id: true, name: true, role: true } },
        },
      })
    )
  );

  await writeAuditLog({
    actorId: req.user.id,
    action: "RUN",
    module: "REMINDER",
    entityType: "PaymentReminder",
    entityId: null,
    metadata: { count: reminders.length, channel },
  });

  res.json({ sent: reminders.length, reminders });
});

export const listMaintenanceReminders = catchAsync(async (req, res, next) => {
  if (![Role.ADMIN, Role.MEMBER].includes(req.user.role)) {
    return next(new ApiError(403, "Forbidden"));
  }

  const where = req.user.role === Role.MEMBER
    ? { invoice: { flatId: req.user.flatId } }
    : {};

  const reminders = await prisma.paymentReminder.findMany({
    where,
    include: {
      invoice: { include: { flat: true } },
      sentBy: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  res.json(reminders);
});

export const createIncidentTask = catchAsync(async (req, res, next) => {
  if (![Role.ADMIN, Role.SECURITY].includes(req.user.role)) {
    return next(new ApiError(403, "Forbidden"));
  }

  const alertId = Number(req.params.id);
  const { assignedToId, note } = req.body;

  const alert = await prisma.emergencyAlert.findUnique({ where: { id: alertId } });
  if (!alert) return next(new ApiError(404, "Emergency alert not found"));

  const task = await prisma.incidentTask.create({
    data: {
      alertId,
      assignedToId,
      createdById: req.user.id,
      note,
    },
    include: {
      alert: true,
      assignedTo: { select: { id: true, name: true, role: true } },
      createdBy: { select: { id: true, name: true, role: true } },
    },
  });

  await writeAuditLog({
    actorId: req.user.id,
    action: "CREATE",
    module: "INCIDENT",
    entityType: "IncidentTask",
    entityId: task.id,
    metadata: { alertId, assignedToId },
  });

  res.status(201).json(task);
});

export const listIncidentTasks = catchAsync(async (req, res) => {
  const alertId = Number(req.params.id);
  const tasks = await prisma.incidentTask.findMany({
    where: { alertId },
    include: {
      assignedTo: { select: { id: true, name: true, role: true } },
      createdBy: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(tasks);
});

export const updateIncidentTask = catchAsync(async (req, res, next) => {
  const alertId = Number(req.params.id);
  const taskId = Number(req.params.taskId);
  const { status, note } = req.body;

  const task = await prisma.incidentTask.findUnique({ where: { id: taskId } });
  if (!task || task.alertId !== alertId) {
    return next(new ApiError(404, "Incident task not found"));
  }

  const updated = await prisma.incidentTask.update({
    where: { id: taskId },
    data: {
      status: status || task.status,
      note: note || task.note,
    },
    include: {
      assignedTo: { select: { id: true, name: true, role: true } },
      createdBy: { select: { id: true, name: true, role: true } },
    },
  });

  res.json(updated);
});
