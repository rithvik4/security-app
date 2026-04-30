import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";

export const authenticate = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return next(new ApiError(401, "Unauthorized"));
    }

    const payload = jwt.verify(token, env.jwtAccessSecret);
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      return next(new ApiError(401, "Invalid or expired token"));
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return next(new ApiError(401, "Unauthorized"));
    }

    req.user = {
      id: user.id,
      role: user.role,
      flatId: user.flatId,
      name: user.name,
      email: user.email,
      phone: user.phone,
    };

    next();
  } catch (_error) {
    next(new ApiError(401, "Invalid or expired token"));
  }
};
