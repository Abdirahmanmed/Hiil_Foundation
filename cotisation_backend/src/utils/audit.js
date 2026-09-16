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
  } catch (err) {
    // Le principe reste bon — l'audit ne doit jamais casser la requête métier —
    // mais il doit CRIER. Un catch vide arrêtait la piste d'audit en silence
    // (table cassée, colonne renommée, base saturée) pendant que tout le monde
    // continuait de croire qu'elle tournait. Sur un produit qui déplace de
    // l'argent, un audit qu'on croit actif et qui ne l'est pas est pire que pas
    // d'audit du tout.
    console.error("audit_write_failed", {
      action,
      entity,
      entityId,
      userId,
      error: err?.message || String(err),
    });
  }
}
