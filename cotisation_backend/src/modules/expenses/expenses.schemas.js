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

/**
 * Approuver engage une sortie d'argent : on redemande le mot de passe.
 * C'est le vrai second facteur, la ou l'ancien jeton n'en etait pas un — il
 * etait genere par le serveur a l'instant meme de l'approbation.
 */
export const approveExpenseSchema = z.object({
  password: z.string().min(1, "Mot de passe requis"),
});

/**
 * Rejeter sans motif rend l'audit muet : personne ne peut dire, six mois plus
 * tard, pourquoi une depense a ete refusee.
 */
export const rejectExpenseSchema = z.object({
  reason: z.string().trim().min(3, "Motif requis").max(500),
});
