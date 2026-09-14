import { z } from "zod";

const bankPaymentMethods = ["VIREMENT_BANCAIRE", "CHEQUE"];

export const createPaymentOrderSchema = z.object({
  expenseId: z.string().min(1),
  // Plus de `token` : le jeton d'approbation n'existe plus. Le tresorier ne
  // saisit plus rien pour emettre un ordre — il voit la depense approuvee dans
  // sa liste et clique. Le statut APPROUVER est l'autorisation.
  paymentMethod: z.enum(["VIREMENT_BANCAIRE", "CASH", "CHEQUE"]),
  currency: z.enum(["FRANC", "DOLLAR", "BIRR_ETHIOPIEN"]),
  paymentCountry: z.enum(["DJIBOUTI", "ETHIOPIE"]),
  amount: z.coerce.number().int().positive(),
  bankCountry: z.enum(["DJIBOUTI", "ETHIOPIE"]).optional(),
  bankName: z.string().trim().optional(),
  bankReference: z.string().trim().optional(),
  bankAccountHolder: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  if (!bankPaymentMethods.includes(data.paymentMethod)) return;

  for (const field of ["bankName", "bankReference"]) {
    if (!data[field]) {
      ctx.addIssue({
        code: "custom",
        path: [field],
        message: "Champ bancaire obligatoire pour cette méthode de paiement",
      });
    }
  }
});

export const paymentOrderIdParamsSchema = z.object({
  id: z.string().min(1),
});
