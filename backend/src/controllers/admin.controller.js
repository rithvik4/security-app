import bcrypt from "bcrypt";
import { Role } from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { catchAsync } from "../utils/catchAsync.js";

export const getDashboardSummary = catchAsync(async (_req, res) => {
  const [
    totalVisitors,
    totalEntries,
    activeEntries,
    memberCount,
    securityCount,
  ] = await Promise.all([
    prisma.visitor.count(),
    prisma.visitorLog.count(),
    prisma.visitorLog.count({ where: { status: "ENTERED" } }),
    prisma.user.count({ where: { role: Role.MEMBER } }),
    prisma.user.count({ where: { role: Role.SECURITY } }),
  ]);

  res.json({
    totalVisitors,
    totalEntries,
    activeEntries,
    memberCount,
    securityCount,
  });
});

export const createFlat = catchAsync(async (req, res) => {
  const flat = await prisma.flat.create({ data: req.body });
  res.status(201).json(flat);
});

export const createFlatWithMembers = catchAsync(async (req, res) => {
  const { block, flatNumber, members } = req.body;

  const normalizedMembers = members.map((member, index) => ({
    ...member,
    isOwner: member.isOwner ?? index === 0,
  }));

  let ownerCount = normalizedMembers.filter((member) => member.isOwner).length;
  if (ownerCount === 0 && normalizedMembers.length > 0) {
    normalizedMembers[0].isOwner = true;
    ownerCount = 1;
  }

  if (ownerCount > 1) {
    throw new ApiError(400, "Only one owner can be assigned per flat");
  }

  const flatWithMembers = await prisma.$transaction(async (tx) => {
    const flat = await tx.flat.create({
      data: { block, flatNumber },
    });

    for (const member of normalizedMembers) {
      const passwordHash = await bcrypt.hash(member.password, 12);
      const user = await tx.user.create({
        data: {
          name: member.name,
          email: member.email,
          phone: member.phone,
          passwordHash,
          role: Role.MEMBER,
          flatId: flat.id,
        },
      });

      await tx.member.create({
        data: {
          userId: user.id,
          flatId: flat.id,
          isOwner: Boolean(member.isOwner),
        },
      });
    }

    return tx.flat.findUnique({
      where: { id: flat.id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
      },
    });
  });

  res.status(201).json(flatWithMembers);
});

export const listFlats = catchAsync(async (_req, res) => {
  const flats = await prisma.flat.findMany({ orderBy: [{ block: "asc" }, { flatNumber: "asc" }] });
  res.json(flats);
});

export const updateFlat = catchAsync(async (req, res) => {
  const flat = await prisma.flat.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(flat);
});

export const deleteFlat = catchAsync(async (req, res) => {
  await prisma.flat.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export const createMember = catchAsync(async (req, res) => {
  const { name, email, phone, password, flatId, isOwner = false } = req.body;
  const passwordHash = await bcrypt.hash(password, 12);

  const member = await prisma.$transaction(async (tx) => {
    if (isOwner) {
      await tx.member.updateMany({
        where: { flatId },
        data: { isOwner: false },
      });
    }

    const user = await tx.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        role: Role.MEMBER,
        flatId,
      },
    });

    return tx.member.create({
      data: { userId: user.id, flatId, isOwner },
      include: { user: true, flat: true },
    });
  });

  res.status(201).json(member);
});

export const listMembers = catchAsync(async (req, res) => {
  const { block, flatNumber, q } = req.query;
  const members = await prisma.member.findMany({
    where: {
      user: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      flat: {
        block: block || undefined,
        flatNumber: flatNumber || undefined,
      },
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true, role: true, flatId: true },
      },
      flat: true,
    },
    orderBy: { id: "desc" },
  });

  res.json(members);
});

export const updateMember = catchAsync(async (req, res, next) => {
  const id = Number(req.params.id);
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.role !== Role.MEMBER) {
    return next(new ApiError(404, "Member not found"));
  }

  const existingMember = await prisma.member.findFirst({ where: { userId: id } });
  if (!existingMember) {
    return next(new ApiError(404, "Member profile not found"));
  }

  const { password, flatId, isOwner, ...rest } = req.body;
  const data = { ...rest };
  const nextFlatId = flatId || existingMember.flatId;

  if (password) {
    data.passwordHash = await bcrypt.hash(password, 12);
  }
  if (flatId) {
    data.flatId = flatId;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, phone: true, role: true, flatId: true },
    });

    if (flatId) {
      await tx.member.updateMany({
        where: { userId: id },
        data: { flatId },
      });
    }

    if (typeof isOwner === "boolean") {
      if (isOwner) {
        await tx.member.updateMany({
          where: { flatId: nextFlatId },
          data: { isOwner: false },
        });
      }

      await tx.member.updateMany({
        where: { userId: id },
        data: { isOwner },
      });
    }

    return user;
  });

  res.json(updated);
});

export const deleteMember = catchAsync(async (req, res) => {
  await prisma.user.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export const createSecurity = catchAsync(async (req, res) => {
  const { name, email, phone, password } = req.body;
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      role: Role.SECURITY,
    },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });

  res.status(201).json(user);
});

export const listSecurity = catchAsync(async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: Role.SECURITY },
    select: { id: true, name: true, email: true, phone: true, role: true },
    orderBy: { id: "desc" },
  });

  res.json(users);
});

export const updateSecurity = catchAsync(async (req, res, next) => {
  const id = Number(req.params.id);
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.role !== Role.SECURITY) {
    return next(new ApiError(404, "Security user not found"));
  }

  const { password, ...rest } = req.body;
  const data = { ...rest };
  if (password) {
    data.passwordHash = await bcrypt.hash(password, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, phone: true, role: true },
  });

  res.json(user);
});

export const deleteSecurity = catchAsync(async (req, res) => {
  await prisma.user.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export const listVisitorLogs = catchAsync(async (req, res) => {
  const { dateFrom, dateTo, block, flatNumber, status, enteredBy } = req.query;

  const where = {
    enteredBy: enteredBy ? Number(enteredBy) : undefined,
    status: status || undefined,
    entryTime: {
      gte: dateFrom ? new Date(dateFrom) : undefined,
      lte: dateTo ? new Date(dateTo) : undefined,
    },
    flat: {
      block: block || undefined,
      flatNumber: flatNumber || undefined,
    },
  };

  const logs = await prisma.visitorLog.findMany({
    where,
    include: {
      visitor: true,
      flat: true,
      guard: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
    orderBy: { entryTime: "desc" },
  });

  res.json(logs);
});
