import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAccessToken({ sub, role }) {
  return jwt.sign({ sub, role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  });
}

export function signRefreshToken({ sub, role }) {
  return jwt.sign({ sub, role }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}
