import crypto from "crypto";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";

const parseDurationToMs = (value) => {
  const match = /^([0-9]+)([smhd])$/.exec(value);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * multipliers[unit];
};

export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const createAccessToken = (user) => {
  return jwt.sign({ role: user.role }, env.jwtAccessSecret, {
    subject: String(user.id),
    expiresIn: env.jwtAccessExpiresIn,
  });
};

export const createRefreshToken = (user) => {
  return jwt.sign({ type: "refresh" }, env.jwtRefreshSecret, {
    subject: String(user.id),
    expiresIn: env.jwtRefreshExpiresIn,
  });
};

export const persistRefreshToken = async (userId, refreshToken) => {
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.jwtRefreshExpiresIn));

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });
};

export const revokeRefreshToken = async (refreshToken) => {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};
