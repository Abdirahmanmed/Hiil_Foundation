import { z } from "zod";

export const subscriptionPaymentParamsSchema = z.object({
  subscriptionId: z.string().min(1, "subscriptionId requis"),
}).strict();

export const confirmPaymentBodySchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "OTP invalide"),
}).strict();
