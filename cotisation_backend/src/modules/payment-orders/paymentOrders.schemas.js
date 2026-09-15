import { z } from "zod";

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
});

// Le superRefine qui exigeait bankName et bankReference a ete retire, et ce
// n'est pas un relachement : la regle est CONDITIONNELLE a la depense, et zod
// n'a pas acces a la base.
//
// Depuis que les coordonnees du beneficiaire vivent sur la depense, le tresorier
// ne saisit plus rien — le formulaire affiche le compte approuve en lecture
// seule. Le schema exigeait donc des champs que le front n'envoyait plus :
// TOUTE depense au nouveau format etait indecaissable, sans qu'aucun champ ne
// puisse etre corrige depuis l'ecran.
//
// La regle vit desormais dans createPaymentOrder, qui sait si la depense porte
// deja un compte.

export const paymentOrderIdParamsSchema = z.object({
  id: z.string().min(1),
});

// Annuler un ordre libere la depense pour une reemission : le motif est ce qui
// permet, plus tard, de distinguer une erreur de saisie d'un detournement.
export const cancelPaymentOrderSchema = z.object({
  reason: z.string().trim().min(3, "Motif requis").max(500),
});

// La date de sortie bancaire reelle. Par defaut maintenant, mais la tresorerie
// constate souvent le virement quelques jours plus tard sur son releve.
export const executePaymentOrderSchema = z.object({
  executedAt: z.coerce.date().optional(),
});
