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
