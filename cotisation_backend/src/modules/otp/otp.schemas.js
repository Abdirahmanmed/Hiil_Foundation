import { z } from "zod";

/**
 * Envoi OTP par EMAIL
 */
export const sendOtpSchema = z.object({
  email: z.string().email("Email invalide").min(1, "Email requis"),
});

/**
 * Vérification OTP
 */
export const verifyOtpSchema = z.object({
  email: z.string().email("Email invalide").min(1, "Email requis"),
  code: z.string().regex(/^\d{6}$/, "Le code OTP doit contenir exactement 6 chiffres"),
});
