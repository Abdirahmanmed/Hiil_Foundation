import { z } from "zod";

export const AccountTypeEnum = z.enum(["CLIENT_ADHERENT", "ASSOCIATION"]);

const trim = (v) => (typeof v === "string" ? v.trim() : v);

export const registerSchema = z
  .object({
    accountType: AccountTypeEnum.default("CLIENT_ADHERENT"),

    // ADHERENT
    fullName: z.string().optional(),
    phone: z.string().min(6, "Téléphone requis"),
    email: z.string().email("Email invalide"),
    country: z.string().min(2, "Pays requis"),
    city: z.string().min(2, "Ville requise"),
    password: z.string().min(6, "Mot de passe min 6 caractères"),

    // ASSOCIATION
    companyName: z.string().optional(),
    phone2: z.string().optional(),
    commune: z.string().optional(),

    acceptedConditions: z.boolean(),
  })
  .transform((d) => ({
    ...d,
    fullName: trim(d.fullName),
    companyName: trim(d.companyName),
    phone: trim(d.phone),
    phone2: trim(d.phone2),
    email: trim(d.email),
    country: trim(d.country),
    city: trim(d.city),
    commune: trim(d.commune),
  }))
  .superRefine((data, ctx) => {
    if (!data.acceptedConditions) {
      ctx.addIssue({
        code: "custom",
        path: ["acceptedConditions"],
        message: "Tu dois accepter les conditions d’utilisation.",
      });
    }

    if (data.accountType === "CLIENT_ADHERENT") {
      if (!data.fullName || data.fullName.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["fullName"],
          message: "Nom requis",
        });
      }
      // fichiers gérés côté service (multer)
    }

    if (data.accountType === "ASSOCIATION") {
      if (!data.companyName || data.companyName.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["companyName"],
          message: "Nom de la société requis",
        });
      }
      if (!data.commune || data.commune.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["commune"],
          message: "Commune requise",
        });
      }
      // phone2 recommandé (si tu veux obligatoire, décommente)
      // if (!data.phone2 || data.phone2.length < 6) {
      //   ctx.addIssue({ code: "custom", path: ["phone2"], message: "Deuxième numéro requis" });
      // }
    }
  });

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});
