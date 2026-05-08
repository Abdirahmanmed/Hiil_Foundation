import { z } from "zod";

export const setUserStatusSchema = z.object({
  status: z.enum(["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "BLOCKED"]),
});

export const setUserRoleSchema = z.object({
  role: z.enum(["CLIENT", "ADMIN"]),
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
