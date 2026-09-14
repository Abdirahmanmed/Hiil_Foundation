import { z } from "zod";

export const setUserStatusSchema = z.object({
  status: z.enum(["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "BLOCKED"]),
});

export const setUserRoleSchema = z.object({
  role: z.enum(["ADMIN", "GESTIONNAIRE_DEPENSE", "EQUIPE_TRESORERIE"]),
});

/**
 * Creation d'un compte interne.
 *
 * Ni `password`, ni `confirmPassword`, ni `status` : le createur d'un compte ne
 * doit jamais en connaitre le secret. Sans cette regle, l'ADMIN qui cree le
 * gestionnaire de depense ET le tresorier peut se connecter sous leurs deux
 * identites, et la separation des pouvoirs — la raison d'etre du produit —
 * n'existe plus que sur le papier.
 *
 * Le compte nait en PENDING_VERIFICATION ; son titulaire fixe son mot de passe
 * via le jeton d'invitation envoye a sa propre adresse email.
 */
export const createInternalUserSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(1),
  role: z.enum(["ADMIN", "GESTIONNAIRE_DEPENSE", "EQUIPE_TRESORERIE"]),
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
