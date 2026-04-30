import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { catchAsync } from "../utils/catchAsync.js";

export const myVisitors = catchAsync(async (req, res, next) => {
  if (!req.user.flatId) {
    return next(new ApiError(400, "No flat mapped for this member"));
  }

  const logs = await prisma.visitorLog.findMany({
    where: { flatId: req.user.flatId },
    include: { visitor: true, flat: true },
    orderBy: { entryTime: "desc" },
  });

  res.json(logs);
});

export const decideVisitor = catchAsync(async (req, res, next) => {
  if (!req.user.flatId) {
    return next(new ApiError(400, "No flat mapped for this member"));
  }

  const logId = Number(req.params.logId);
  const { action } = req.body;

  const log = await prisma.visitorLog.findUnique({ where: { id: logId } });
  if (!log || log.flatId !== req.user.flatId) {
    return next(new ApiError(404, "Visitor log not found"));
  }

  if (action === "approve") {
    const updated = await prisma.visitorLog.update({
      where: { id: logId },
      data: {
        approvedAt: new Date(),
        status: "ENTERED",
      },
    });

    return res.json({ message: "Visitor approved", log: updated });
  }

  const updated = await prisma.visitorLog.update({
    where: { id: logId },
    data: {
      status: "REJECTED",
      approvedAt: null,
      exitTime: log.exitTime || new Date(),
    },
  });

  res.json({ message: "Visitor rejected", log: updated });
});
