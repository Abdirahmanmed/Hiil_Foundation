import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * `tv` porte la version de jeton du compte. Sans elle, le premier increment de
 * tokenVersion verrouillerait l'utilisateur DEFINITIVEMENT : chaque nouvelle
 * connexion produirait un jeton sans `tv`, donc 0 !== 1, donc 401 en boucle.
 */
export function signAccessToken({ sub, role, tv = 0 }) {
  return jwt.sign({ sub, role, tv }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  });
}

export function signRefreshToken({ sub, role, tv = 0 }) {
  return jwt.sign({ sub, role, tv }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}
