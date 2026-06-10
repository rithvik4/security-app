import { Role } from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { writeAuditLog } from "../utils/audit.js";
import { catchAsync } from "../utils/catchAsync.js";

// ─── Polls ────────────────────────────────────────────────────────────────────

export const createPoll = catchAsync(async (req, res, next) => {
  if (req.user.role !== Role.ADMIN) return next(new ApiError(403, "Forbidden"));

  const { question, description, closesAt, options } = req.body;

  const poll = await prisma.societyPoll.create({
    data: {
      createdById: req.user.id,
      question,
      description,
      closesAt: new Date(closesAt),
      options: {
        create: options.map((text) => ({ text })),
      },
    },
    include: {
      options: { include: { _count: { select: { votes: true } } } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  await writeAuditLog({ actorId: req.user.id, action: "CREATE", module: "POLL", entityType: "SocietyPoll", entityId: poll.id, metadata: { question } });
  res.status(201).json(poll);
});

export const listPolls = catchAsync(async (_req, res) => {
  const polls = await prisma.societyPoll.findMany({
    include: {
      options: {
        include: { _count: { select: { votes: true } } },
      },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { options: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(polls);
});

export const voteOnPoll = catchAsync(async (req, res, next) => {
  const pollId = Number(req.params.id);
  const { optionId } = req.body;

  const poll = await prisma.societyPoll.findUnique({ where: { id: pollId } });
  if (!poll) return next(new ApiError(404, "Poll not found"));
  if (!poll.isActive || new Date(poll.closesAt) < new Date()) {
    return next(new ApiError(400, "Poll is closed"));
  }

  const option = await prisma.pollOption.findUnique({ where: { id: optionId } });
  if (!option || option.pollId !== pollId) return next(new ApiError(400, "Invalid option"));

  const existing = await prisma.pollVote.findUnique({
    where: { pollId_userId: { pollId, userId: req.user.id } },
  });
  if (existing) return next(new ApiError(409, "You have already voted on this poll"));

  const vote = await prisma.pollVote.create({
    data: { pollId, optionId, userId: req.user.id },
    include: { option: true, user: { select: { id: true, name: true } } },
  });

  res.status(201).json(vote);
});

export const getPollResults = catchAsync(async (req, res, next) => {
  const pollId = Number(req.params.id);

  const poll = await prisma.societyPoll.findUnique({
    where: { id: pollId },
    include: {
      options: {
        include: { _count: { select: { votes: true } } },
      },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!poll) return next(new ApiError(404, "Poll not found"));

  const totalVotes = poll.options.reduce((sum, o) => sum + o._count.votes, 0);

  const myVote = await prisma.pollVote.findUnique({
    where: { pollId_userId: { pollId, userId: req.user.id } },
    include: { option: true },
  });

  res.json({
    poll,
    totalVotes,
    myVote: myVote ? { optionId: myVote.optionId, optionText: myVote.option.text } : null,
  });
});

export const closePoll = catchAsync(async (req, res, next) => {
  if (req.user.role !== Role.ADMIN) return next(new ApiError(403, "Forbidden"));
  const id = Number(req.params.id);

  const poll = await prisma.societyPoll.update({
    where: { id },
    data: { isActive: false },
  });

  res.json(poll);
});

// ─── Parking ──────────────────────────────────────────────────────────────────

export const createParkingSlot = catchAsync(async (req, res, next) => {
  if (req.user.role !== Role.ADMIN) return next(new ApiError(403, "Forbidden"));
  const { slotNumber, type, block } = req.body;

  const slot = await prisma.parkingSlot.create({
    data: { slotNumber, type, block },
  });

  res.status(201).json(slot);
});

export const listParkingSlots = catchAsync(async (req, res) => {
  const { type, block, available } = req.query;

  const slots = await prisma.parkingSlot.findMany({
    where: {
      type: type || undefined,
      block: block || undefined,
      isActive: true,
    },
    include: {
      allocations: {
        where: { releasedAt: null },
        include: { flat: true, markedBy: { select: { id: true, name: true } } },
        take: 1,
      },
    },
    orderBy: { slotNumber: "asc" },
  });

  const result = available === "true"
    ? slots.filter((s) => s.allocations.length === 0)
    : slots;

  res.json(result);
});

export const allocateParkingSlot = catchAsync(async (req, res, next) => {
  if (![Role.ADMIN, Role.SECURITY].includes(req.user.role)) {
    return next(new ApiError(403, "Forbidden"));
  }

  const slotId = Number(req.params.id);
  const { vehicleNo, purpose, flatId } = req.body;

  const slot = await prisma.parkingSlot.findUnique({ where: { id: slotId } });
  if (!slot || !slot.isActive) return next(new ApiError(404, "Parking slot not found"));

  const occupied = await prisma.parkingAllocation.findFirst({
    where: { slotId, releasedAt: null },
  });
  if (occupied) return next(new ApiError(409, "Slot is already occupied"));

  const allocation = await prisma.parkingAllocation.create({
    data: { slotId, vehicleNo, purpose, flatId: flatId || null, markedById: req.user.id },
    include: {
      slot: true,
      flat: true,
      markedBy: { select: { id: true, name: true } },
    },
  });

  await writeAuditLog({ actorId: req.user.id, action: "ALLOCATE", module: "PARKING", entityType: "ParkingAllocation", entityId: allocation.id, metadata: { slotId, vehicleNo } });
  res.status(201).json(allocation);
});

export const releaseParkingSlot = catchAsync(async (req, res, next) => {
  if (![Role.ADMIN, Role.SECURITY].includes(req.user.role)) {
    return next(new ApiError(403, "Forbidden"));
  }

  const slotId = Number(req.params.id);
  const allocation = await prisma.parkingAllocation.findFirst({
    where: { slotId, releasedAt: null },
  });
  if (!allocation) return next(new ApiError(404, "No active allocation for this slot"));

  const updated = await prisma.parkingAllocation.update({
    where: { id: allocation.id },
    data: { releasedAt: new Date(), markedById: req.user.id },
    include: { slot: true, flat: true, markedBy: { select: { id: true, name: true } } },
  });

  await writeAuditLog({ actorId: req.user.id, action: "RELEASE", module: "PARKING", entityType: "ParkingAllocation", entityId: allocation.id, metadata: { slotId } });
  res.json(updated);
});

export const listParkingAllocations = catchAsync(async (req, res) => {
  const { active } = req.query;

  const allocations = await prisma.parkingAllocation.findMany({
    where: { releasedAt: active === "true" ? null : undefined },
    include: {
      slot: true,
      flat: true,
      markedBy: { select: { id: true, name: true } },
    },
    orderBy: { allocatedAt: "desc" },
    take: 200,
  });

  res.json(allocations);
});
