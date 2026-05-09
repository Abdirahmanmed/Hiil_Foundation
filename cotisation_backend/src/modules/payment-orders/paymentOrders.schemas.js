import { z } from "zod";

export const createPaymentOrderSchema = z.object({
  expenseId: z.string().min(1),
  token: z.string().trim().min(1),
  paymentMethod: z.enum(["VIREMENT_BANCAIRE", "CASH", "CHEQUE"]),
  currency: z.enum(["FRANC", "DOLLAR", "BIRR_ETHIOPIEN"]),
  paymentCountry: z.enum(["DJIBOUTI", "ETHIOPIE"]),
  amount: z.coerce.number().int().positive(),
});

export const paymentOrderIdParamsSchema = z.object({
  id: z.string().min(1),
});
