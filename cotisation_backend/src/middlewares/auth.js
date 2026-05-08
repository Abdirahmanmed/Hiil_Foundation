import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * Attends un header:
 * Authorization: Bearer <token>
 */
export function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    // payload = { sub: userId, role: "CLIENT" | "ADMIN", iat, exp }
    // ✅ NORMALISATION
    req.user = {
      id: payload.sub, // <--- IMPORTANT
      role: payload.role,
      iat: payload.iat,
      exp: payload.exp,
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
