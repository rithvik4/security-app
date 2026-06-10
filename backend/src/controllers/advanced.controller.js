import { Role } from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { writeAuditLog } from "../utils/audit.js";
import { catchAsync } from "../utils/catchAsync.js";

const ensureMemberFlat = async (user) => {
  if (user.role !== Role.MEMBER || !user.flatId) {
    throw new ApiError(400, "Member is not mapped to a flat");
  }

  return user.flatId;
};

export const getResidentDirectory = catchAsync(async (req, res) => {
  const { q, block, flatNumber } = req.query;

  const residents = await prisma.member.findMany({
    where: {
      flat: {
        block: block || undefined,
        flatNumber: flatNumber || undefined,
      },
      user: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
      },
      flat: true,
    },
    orderBy: { id: "desc" },
  });

  res.json(residents);
});

export const verifyResidentIdentity = catchAsync(async (req, res) => {
  const { flatId, identifier } = req.body;

  const resident = await prisma.user.findFirst({
    where: {
      role: Role.MEMBER,
      flatId,
      OR: [{ phone: identifier }, { email: identifier }],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      flat: true,
    },
  });

  res.json({
    verified: Boolean(resident),
    resident,
  });
});

export const createDelivery = catchAsync(async (req, res) => {
  const { flatId, courierName, contactNumber, packageType, expectedAt } = req.body;

  const delivery = await prisma.delivery.create({
    data: {
      flatId,
      courierName,
      contactNumber,
      packageType,
      expectedAt: expectedAt ? new Date(expectedAt) : null,
      createdById: req.user.id,
    },
    include: {
      flat: true,
      createdBy: {
        select: { id: true, name: true, role: true },
      },
      receivedBy: {
        select: { id: true, name: true, role: true },
      },
    },
  });

  await writeAuditLog({
    actorId: req.user.id,
    action: "CREATE",
    module: "DELIVERY",
    entityType: "Delivery",
    entityId: delivery.id,
    metadata: { flatId, courierName },
  });

  res.status(201).json(delivery);
});

export const listDeliveries = catchAsync(async (req, res) => {
  const { status, flatId } = req.query;

  const where = {
    status: status || undefined,
    flatId: flatId ? Number(flatId) : undefined,
  };

  if (req.user.role === Role.MEMBER) {
    where.flatId = await ensureMemberFlat(req.user);
  }

  const deliveries = await prisma.delivery.findMany({
    where,
    include: {
      flat: true,
      createdBy: { select: { id: true, name: true, role: true } },
      receivedBy: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(deliveries);
});

export const updateDeliveryStatus = catchAsync(async (req, res, next) => {
  const deliveryId = Number(req.params.id);
  const { status } = req.body;

  const existing = await prisma.delivery.findUnique({ where: { id: deliveryId } });
  if (!existing) {
    return next(new ApiError(404, "Delivery not found"));
  }

  if (req.user.role === Role.MEMBER) {
    const flatId = await ensureMemberFlat(req.user);
    if (existing.flatId !== flatId || status !== "COLLECTED") {
      return next(new ApiError(403, "Forbidden"));
    }
  }

  const delivery = await prisma.delivery.update({
    where: { id: deliveryId },
    data: {
      status,
      receivedAt: status === "COLLECTED" ? new Date() : existing.receivedAt,
      receivedById: status === "COLLECTED" ? req.user.id : existing.receivedById,
    },
    include: {
      flat: true,
      createdBy: { select: { id: true, name: true, role: true } },
      receivedBy: { select: { id: true, name: true, role: true } },
    },
  });

  await writeAuditLog({
    actorId: req.user.id,
    action: "UPDATE_STATUS",
    module: "DELIVERY",
    entityType: "Delivery",
    entityId: delivery.id,
    metadata: { status },
  });

  res.json(delivery);
});

export const registerVehicle = catchAsync(async (req, res, next) => {
  const { plateNumber, type, brand, color } = req.body;

  if (req.user.role !== Role.MEMBER) {
    return next(new ApiError(403, "Only residents can register vehicles"));
  }

  const flatId = await ensureMemberFlat(req.user);

  const vehicle = await prisma.vehicle.create({
    data: {
      userId: req.user.id,
      flatId,
      plateNumber,
      type,
      brand,
      color,
    },
    include: {
      owner: { select: { id: true, name: true, phone: true, email: true } },
      flat: true,
    },
  });

  await writeAuditLog({
    actorId: req.user.id,
    action: "CREATE",
    module: "VEHICLE",
    entityType: "Vehicle",
    entityId: vehicle.id,
    metadata: { plateNumber, flatId },
  });

  res.status(201).json(vehicle);
});

export const listVehicles = catchAsync(async (req, res) => {
  const { status, flatId, q } = req.query;

  const where = {
    status: status || undefined,
    flatId: flatId ? Number(flatId) : undefined,
    OR: q
      ? [
          { plateNumber: { contains: q, mode: "insensitive" } },
          { owner: { name: { contains: q, mode: "insensitive" } } },
        ]
      : undefined,
  };

  if (req.user.role === Role.MEMBER) {
    where.flatId = await ensureMemberFlat(req.user);
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true, phone: true, email: true } },
      flat: true,
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(vehicles);
});

export const updateVehicleStatus = catchAsync(async (req, res, next) => {
  if (![Role.ADMIN, Role.SECURITY].includes(req.user.role)) {
    return next(new ApiError(403, "Forbidden"));
  }

  const id = Number(req.params.id);
  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: { status: req.body.status },
    include: {
      owner: { select: { id: true, name: true } },
      flat: true,
    },
  });

  await writeAuditLog({
    actorId: req.user.id,
    action: "UPDATE_STATUS",
    module: "VEHICLE",
    entityType: "Vehicle",
    entityId: id,
    metadata: { status: req.body.status },
  });

  res.json(vehicle);
});

export const createEmergencyAlert = catchAsync(async (req, res) => {
  const { level, message, flatId } = req.body;

  const normalizedFlatId = req.user.role === Role.MEMBER ? await ensureMemberFlat(req.user) : flatId || null;

  const alert = await prisma.emergencyAlert.create({
    data: {
      raisedById: req.user.id,
      level,
      message,
      flatId: normalizedFlatId,
    },
    include: {
      raisedBy: { select: { id: true, name: true, role: true } },
      acknowledgedBy: { select: { id: true, name: true, role: true } },
      flat: true,
    },
  });

  await writeAuditLog({
    actorId: req.user.id,
    action: "CREATE",
    module: "EMERGENCY",
    entityType: "EmergencyAlert",
    entityId: alert.id,
    metadata: { level, flatId: normalizedFlatId },
  });

  res.status(201).json(alert);
});

export const listEmergencyAlerts = catchAsync(async (req, res) => {
  const { status, level } = req.query;

  const where = {
    status: status || undefined,
    level: level || undefined,
  };

  if (req.user.role === Role.MEMBER) {
    const flatId = await ensureMemberFlat(req.user);
    where.OR = [{ flatId }, { flatId: null }];
  }

  const alerts = await prisma.emergencyAlert.findMany({
    where,
    include: {
      raisedBy: { select: { id: true, name: true, role: true } },
      acknowledgedBy: { select: { id: true, name: true, role: true } },
      flat: true,
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(alerts);
});

export const acknowledgeEmergencyAlert = catchAsync(async (req, res, next) => {
  if (![Role.ADMIN, Role.SECURITY].includes(req.user.role)) {
    return next(new ApiError(403, "Forbidden"));
  }

  const id = Number(req.params.id);
  const { status } = req.body;

  const update = {
    status,
    acknowledgedById: req.user.id,
    acknowledgedAt: new Date(),
    resolvedAt: status === "RESOLVED" ? new Date() : null,
  };

  const alert = await prisma.emergencyAlert.update({
    where: { id },
    data: update,
    include: {
      raisedBy: { select: { id: true, name: true, role: true } },
      acknowledgedBy: { select: { id: true, name: true, role: true } },
      flat: true,
    },
  });

  await writeAuditLog({
    actorId: req.user.id,
    action: "ACKNOWLEDGE",
    module: "EMERGENCY",
    entityType: "EmergencyAlert",
    entityId: id,
    metadata: { status },
  });

  res.json(alert);
});

export const createMaintenanceInvoice = catchAsync(async (req, res, next) => {
  if (req.user.role !== Role.ADMIN) {
    return next(new ApiError(403, "Forbidden"));
  }

  const { flatId, amount, dueDate, month, year, notes } = req.body;

  const invoice = await prisma.maintenanceInvoice.create({
    data: {
      flatId,
      amount,
      dueDate: new Date(dueDate),
      month,
      year,
      notes,
      createdById: req.user.id,
    },
    include: {
      flat: true,
      createdBy: { select: { id: true, name: true } },
      payments: true,
    },
  });

  await writeAuditLog({
    actorId: req.user.id,
    action: "CREATE",
    module: "MAINTENANCE",
    entityType: "MaintenanceInvoice",
    entityId: invoice.id,
    metadata: { flatId, amount, month, year },
  });

  res.status(201).json(invoice);
});

export const listMaintenanceInvoices = catchAsync(async (req, res) => {
  const { status, month, year, flatId } = req.query;

  const where = {
    status: status || undefined,
    month: month ? Number(month) : undefined,
    year: year ? Number(year) : undefined,
    flatId: flatId ? Number(flatId) : undefined,
  };

  if (req.user.role === Role.MEMBER) {
    where.flatId = await ensureMemberFlat(req.user);
  }

  const invoices = await prisma.maintenanceInvoice.findMany({
    where,
    include: {
      flat: true,
      payments: {
        include: {
          paidBy: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: { paidAt: "desc" },
      },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  res.json(invoices);
});

export const recordMaintenancePayment = catchAsync(async (req, res, next) => {
  const invoiceId = Number(req.params.id);
  const { amount, method, reference } = req.body;

  const invoice = await prisma.maintenanceInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) {
    return next(new ApiError(404, "Invoice not found"));
  }

  if (req.user.role === Role.MEMBER) {
    const flatId = await ensureMemberFlat(req.user);
    if (flatId !== invoice.flatId) {
      return next(new ApiError(403, "Forbidden"));
    }
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.maintenancePayment.create({
      data: {
        invoiceId,
        paidById: req.user.id,
        amount,
        method,
        reference,
      },
      include: {
        paidBy: { select: { id: true, name: true, role: true } },
      },
    });

    const aggregate = await tx.maintenancePayment.aggregate({
      where: { invoiceId },
      _sum: { amount: true },
    });

    const paidAmount = aggregate._sum.amount || 0;
    const nextStatus = paidAmount >= invoice.amount ? "PAID" : "PARTIALLY_PAID";

    await tx.maintenanceInvoice.update({
      where: { id: invoiceId },
      data: { status: nextStatus },
    });

    return created;
  });

  await writeAuditLog({
    actorId: req.user.id,
    action: "PAY",
    module: "MAINTENANCE",
    entityType: "MaintenancePayment",
    entityId: payment.id,
    metadata: { invoiceId, amount, method },
  });

  res.status(201).json(payment);
});

export const createComplaint = catchAsync(async (req, res) => {
  const { category, subject, description, flatId } = req.body;

  const normalizedFlatId = req.user.role === Role.MEMBER ? await ensureMemberFlat(req.user) : flatId;

  const complaint = await prisma.complaintTicket.create({
    data: {
      flatId: normalizedFlatId,
      raisedById: req.user.id,
      category,
      subject,
      description,
    },
    include: {
      flat: true,
      raisedBy: { select: { id: true, name: true, role: true } },
      assignedTo: { select: { id: true, name: true, role: true } },
    },
  });

  await writeAuditLog({
    actorId: req.user.id,
    action: "CREATE",
    module: "COMPLAINT",
    entityType: "ComplaintTicket",
    entityId: complaint.id,
    metadata: { category, flatId: normalizedFlatId },
  });

  res.status(201).json(complaint);
});

export const listComplaints = catchAsync(async (req, res) => {
  const { status, category, flatId } = req.query;

  const where = {
    status: status || undefined,
    category: category || undefined,
    flatId: flatId ? Number(flatId) : undefined,
  };

  if (req.user.role === Role.MEMBER) {
    where.flatId = await ensureMemberFlat(req.user);
  }

  const complaints = await prisma.complaintTicket.findMany({
    where,
    include: {
      flat: true,
      raisedBy: { select: { id: true, name: true, role: true } },
      assignedTo: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(complaints);
});

export const updateComplaintStatus = catchAsync(async (req, res, next) => {
  if (![Role.ADMIN, Role.SECURITY].includes(req.user.role)) {
    return next(new ApiError(403, "Forbidden"));
  }

  const id = Number(req.params.id);
  const { status, assignedToId } = req.body;

  const complaint = await prisma.complaintTicket.update({
    where: { id },
    data: {
      status,
      assignedToId: assignedToId || null,
      resolvedAt: ["RESOLVED", "CLOSED"].includes(status) ? new Date() : null,
    },
    include: {
      flat: true,
      raisedBy: { select: { id: true, name: true, role: true } },
      assignedTo: { select: { id: true, name: true, role: true } },
    },
  });

  await writeAuditLog({
    actorId: req.user.id,
    action: "UPDATE_STATUS",
    module: "COMPLAINT",
    entityType: "ComplaintTicket",
    entityId: id,
    metadata: { status, assignedToId },
  });

  res.json(complaint);
});

export const createAnnouncement = catchAsync(async (req, res, next) => {
  if (req.user.role !== Role.ADMIN) {
    return next(new ApiError(403, "Forbidden"));
  }

  const { title, message, audienceRole } = req.body;

  const announcement = await prisma.announcement.create({
    data: {
      authorId: req.user.id,
      title,
      message,
      audienceRole,
    },
    include: {
      author: { select: { id: true, name: true, role: true } },
    },
  });

  await writeAuditLog({
    actorId: req.user.id,
    action: "CREATE",
    module: "COMMUNICATION",
    entityType: "Announcement",
    entityId: announcement.id,
    metadata: { audienceRole },
  });

  res.status(201).json(announcement);
});

export const listAnnouncements = catchAsync(async (req, res) => {
  const announcements = await prisma.announcement.findMany({
    where: {
      OR: [{ audienceRole: null }, { audienceRole: req.user.role }],
    },
    include: {
      author: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(announcements);
});

export const getGuardDashboard = catchAsync(async (req, res, next) => {
  if (req.user.role !== Role.SECURITY) {
    return next(new ApiError(403, "Forbidden"));
  }

  const [
    activeVisitors,
    expectedDeliveries,
    openEmergencyAlerts,
    blockedVehicles,
    openComplaints,
  ] = await Promise.all([
    prisma.visitorLog.count({ where: { status: "ENTERED" } }),
    prisma.delivery.count({ where: { status: "EXPECTED" } }),
    prisma.emergencyAlert.count({ where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } } }),
    prisma.vehicle.count({ where: { status: "BLOCKED" } }),
    prisma.complaintTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);

  res.json({
    activeVisitors,
    expectedDeliveries,
    openEmergencyAlerts,
    blockedVehicles,
    openComplaints,
  });
});

export const getAnalyticsOverview = catchAsync(async (req, res, next) => {
  if (req.user.role !== Role.ADMIN) {
    return next(new ApiError(403, "Forbidden"));
  }

  const [
    residentCount,
    visitorEntries,
    activeVehicles,
    openEmergencies,
    pendingInvoices,
    complaintBacklog,
    deliveriesToday,
  ] = await Promise.all([
    prisma.user.count({ where: { role: Role.MEMBER } }),
    prisma.visitorLog.count(),
    prisma.vehicle.count({ where: { status: "ACTIVE" } }),
    prisma.emergencyAlert.count({ where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } } }),
    prisma.maintenanceInvoice.count({ where: { status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] } } }),
    prisma.complaintTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.delivery.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  res.json({
    residentCount,
    visitorEntries,
    activeVehicles,
    openEmergencies,
    pendingInvoices,
    complaintBacklog,
    deliveriesToday,
  });
});

export const listAuditLogs = catchAsync(async (req, res, next) => {
  if (req.user.role !== Role.ADMIN) {
    return next(new ApiError(403, "Forbidden"));
  }

  const { module, actorId, limit = 100 } = req.query;

  const logs = await prisma.auditLog.findMany({
    where: {
      module: module || undefined,
      actorId: actorId ? Number(actorId) : undefined,
    },
    include: {
      actor: {
        select: { id: true, name: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(limit) || 100, 200),
  });

  res.json(logs);
});
