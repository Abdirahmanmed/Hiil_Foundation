import prisma from "../config/prisma.js";

/**
 * Audit minimal - ne doit JAMAIS casser la requête principale.
 */
export async function auditLog({
  userId = null,
  action,
  entity,
  entityId = null,
  req,
  meta = null,
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        meta,
        ip: req?.ip || null,
        userAgent: req?.headers?.["user-agent"] || null,
      },
    });
  } catch {
    // silent fail
  }
}
