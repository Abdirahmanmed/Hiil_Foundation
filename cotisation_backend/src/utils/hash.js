import argon2 from "argon2";
import crypto from "crypto";
import { env } from "../config/env.js";

export const ARGON2_PASSWORD_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password) {
  return argon2.hash(password, ARGON2_PASSWORD_OPTIONS);
}

export async function verifyPassword(hash, password) {
  return argon2.verify(hash, password);
}

/**
 * OTP hashé (ne jamais stocker le code en clair)
 * sha256(code + pepper)
 */
export function hashOtp(code) {
  return crypto
    .createHash("sha256")
    .update(String(code) + env.OTP_PEPPER)
    .digest("hex");
}

/**
 * Jeton d'invitation d'un compte interne.
 * sha256 : le jeton fait 32 octets aleatoires, il n'a donc pas besoin d'un
 * hachage lent — seul le vol de la base doit rester sans effet.
 */
export function hashInviteToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token) + env.OTP_PEPPER)
    .digest("hex");
}

/**
 * Mot de passe volontairement inutilisable, pour un compte cree par un tiers.
 * Le titulaire fixera le sien via le jeton d'invitation. Personne — pas meme le
 * createur du compte — ne connait cette valeur.
 */
export async function hashUnusablePassword() {
  return hashPassword(crypto.randomBytes(48).toString("base64url"));
}
