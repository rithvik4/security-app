import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { catchAsync } from "../utils/catchAsync.js";

export const createVisitorEntry = catchAsync(async (req, res) => {
  const {
    visitorName,
    phone,
    flatId,
    peopleCount,
    vehicleNumber,
    purpose,
  } = req.body;

  const visitor = await prisma.visitor.create({
    data: {
      name: visitorName,
      phone,
      vehicleNumber,
    },
  });

  const log = await prisma.visitorLog.create({
    data: {
      visitorId: visitor.id,
      flatId,
      enteredBy: req.user.id,
      peopleCount,
      purpose,
      status: "ENTERED",
    },
    include: {
      visitor: true,
      flat: true,
    },
  });

  res.status(201).json(log);
});

export const listFlatsForSecurity = catchAsync(async (_req, res) => {
  const flats = await prisma.flat.findMany({
    orderBy: [{ block: "asc" }, { flatNumber: "asc" }],
  });

  res.json(flats);
});

export const markVisitorExit = catchAsync(async (req, res, next) => {
  const logId = Number(req.params.logId);
  const existing = await prisma.visitorLog.findUnique({ where: { id: logId } });

  if (!existing) {
    return next(new ApiError(404, "Visitor log not found"));
  }
  if (existing.status === "EXITED") {
    return next(new ApiError(400, "Visitor already marked exited"));
  }

  const updated = await prisma.visitorLog.update({
    where: { id: logId },
    data: {
      exitTime: new Date(),
      status: "EXITED",
    },
    include: {
      visitor: true,
      flat: true,
    },
  });

  res.json(updated);
});

export const listActiveEntries = catchAsync(async (_req, res) => {
  const logs = await prisma.visitorLog.findMany({
    where: { status: "ENTERED" },
    include: { visitor: true, flat: true },
    orderBy: { entryTime: "desc" },
  });

  res.json(logs);
});
