import { z } from "zod";

export const expenseTypes = ["ALIMENTATION", "CONSTRUCTION", "MEDICAMENT"];
export const countries = ["DJIBOUTI", "ETHIOPIE"];

export const createExpenseSchema = z.object({
  date: z.coerce.date().optional(),
  type: z.enum(expenseTypes),
  label: z.string().trim().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().int().positive(),
  amount: z.coerce.number().int().positive().optional(),
  beneficiaryName: z.string().trim().min(1),
  beneficiaryCountry: z.enum(countries),
  beneficiaryCity: z.string().trim().min(1),
});

export const expenseIdParamsSchema = z.object({
  id: z.string().min(1),
});
