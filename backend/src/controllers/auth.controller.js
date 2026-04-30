import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  persistRefreshToken,
  revokeRefreshToken,
} from "../services/token.service.js";

const userPayload = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  flatId: user.flatId,
});

export const login = catchAsync(async (req, res, next) => {
  const { identifier, password } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { phone: identifier }],
    },
  });

  if (!user) {
    return next(new ApiError(401, "Invalid credentials"));
  }

  const matched = await bcrypt.compare(password, user.passwordHash);
  if (!matched) {
    return next(new ApiError(401, "Invalid credentials"));
  }

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  await persistRefreshToken(user.id, refreshToken);

  res.json({
    user: userPayload(user),
    accessToken,
    refreshToken,
  });
});

export const refresh = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;

  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch (_error) {
    return next(new ApiError(401, "Invalid refresh token"));
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!stored) {
    return next(new ApiError(401, "Refresh token revoked or expired"));
  }

  const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });
  if (!user) {
    return next(new ApiError(401, "User not found"));
  }

  await revokeRefreshToken(refreshToken);

  const nextAccessToken = createAccessToken(user);
  const nextRefreshToken = createRefreshToken(user);
  await persistRefreshToken(user.id, nextRefreshToken);

  res.json({
    user: userPayload(user),
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
  });
});

export const logout = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  await revokeRefreshToken(refreshToken);
  res.json({ message: "Logged out" });
});

export const me = catchAsync(async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return next(new ApiError(404, "User not found"));
  }

  res.json({ user: userPayload(user) });
});
