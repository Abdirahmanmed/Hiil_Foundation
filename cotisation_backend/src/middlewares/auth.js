import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import prisma from "../config/prisma.js";

/**
 * Le middleware ne se contentait que d'un jwt.verify : il construisait req.user
 * depuis le payload, sans jamais relire la base. Suspendre ou retrograder
 * quelqu'un ne lui retirait donc RIEN tant que son jeton n'avait pas expire —
 * un tresorier revoque continuait de decaisser pendant quinze minutes. C'etait
 * le trou le plus directement exploitable du back-office, et il annulait le
 * pouvoir de suspension donne a l'ADMIN.
 *
 * Arbitrage : une lecture base a chaque requete, mise en cache 30 secondes en
 * memoire du process. Raccourcir le JWT ne reglait rien (un refresh frequent
 * lit la base de toute facon, et laisse une fenetre). Le cache borne la
 * revocation a 30 secondes au lieu de 15 minutes pour un cout quasi nul, et il
 * n'y a qu'un process.
 */
const CACHE_TTL_MS = 30_000;
const cache = new Map();

export function invalidateUserCache(userId) {
  cache.delete(userId);
}

async function loadUser(userId) {
  const entree = cache.get(userId);
  if (entree && entree.expiresAt > Date.now()) return entree.user;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true, tokenVersion: true },
  });

  cache.set(userId, { user, expiresAt: Date.now() + CACHE_TTL_MS });
  return user;
}

/**
 * Attends un header:
 * Authorization: Bearer <token>
 */
export async function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  try {
    const user = await loadUser(payload.sub);

    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    if ((payload.tv ?? 0) !== user.tokenVersion) {
      return res
        .status(401)
        .json({ code: "SESSION_REVOKED", message: "Session expirée. Reconnectez-vous." });
    }

    if (user.status !== "ACTIVE") {
      return res
        .status(403)
        .json({ code: `ACCOUNT_${user.status}`, message: "Ce compte n'est plus actif." });
    }

    // Le role vient desormais de la BASE, plus du jeton : requireRole devient
    // fiable sans changer une ligne, et une retrogradation prend effet en
    // moins de 30 secondes.
    req.user = {
      id: user.id,
      role: user.role,
      status: user.status,
      iat: payload.iat,
      exp: payload.exp,
    };
    return next();
  } catch (err) {
    return next(err);
  }
}
