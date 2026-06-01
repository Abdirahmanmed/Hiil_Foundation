import { z } from "zod";

export const setUserStatusSchema = z.object({
  status: z.enum(["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "BLOCKED"]),
});

export const setUserRoleSchema = z.object({
  role: z.enum(["ADMIN", "GESTIONNAIRE_DEPENSE", "EQUIPE_TRESORERIE"]),
});

export const createInternalUserSchema = z
  .object({
    fullName: z.string().trim().min(1),
    email: z.string().trim().email(),
    phone: z.string().trim().min(1),
    role: z.enum(["ADMIN", "GESTIONNAIRE_DEPENSE", "EQUIPE_TRESORERIE"]),
    status: z.enum(["ACTIVE", "SUSPENDED"]).default("ACTIVE"),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe sont différents",
  });

export const resetUserOtpSchema = z.object({});

export const setSubscriptionStatusSchema = z.object({
  status: z.enum([
    "DRAFT",
    "PENDING_CONSENT",
    "ACTIVE",
    "ACTIVE_MANUAL",
    "CANCELLED",
  ]),
});

export const forceConsentSchema = z.object({
  consentVersion: z.string().min(1).optional(),
});
