import { auditLog } from "../utils/audit.js";

/**
 * Liste blanche de roles. Les groupes sont declares dans config/roles.js, qui
 * est la seule source de verite de la separation des pouvoirs.
 *
 * Un refus est journalise : sans cela, quelqu'un qui teste patiemment les
 * routes d'ecriture qu'il n'a pas le droit d'appeler ne laisse aucune trace.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      auditLog({
        userId: req.user.id,
        action: "ACCESS_DENIED",
        entity: "Route",
        entityId: `${req.method} ${req.baseUrl}${req.path}`,
        req,
        meta: { role: req.user.role, allowed: roles },
      });
      return res.status(403).json({ message: "Forbidden" });
    }

    return next();
  };
}
