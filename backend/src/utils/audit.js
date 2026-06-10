import { prisma } from "../config/prisma.js";

export const writeAuditLog = async ({
  actorId,
  action,
  module,
  entityType,
  entityId,
  metadata,
}) => {
  try {
    if (!prisma.auditLog || typeof prisma.auditLog.create !== "function") {
      return;
    }

    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        module,
        entityType,
        entityId: entityId ? String(entityId) : null,
        metadata,
      },
    });
  } catch (_error) {
    // Audit writes should not break core user flows.
  }
};
