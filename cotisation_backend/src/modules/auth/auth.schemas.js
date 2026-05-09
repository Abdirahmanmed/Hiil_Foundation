import { z } from "zod";

export const AccountTypeEnum = z.enum(["CLIENT_ADHERENT", "ASSOCIATION"]);

const AssociationCountryEnum = z.enum(["Djibouti", "Ethiopie"]);
const RepresentativeTypeEnum = z.enum([
  "PRESIDENT",
  "SECRETAIRE_GENERAL",
  "VICE_PRESIDENT",
]);

const trim = (v) => (typeof v === "string" ? v.trim() : v);
const optionalTrimmedString = z.string().optional().transform(trim);
const requiredTrimmedString = (message, min = 1) =>
  z.preprocess(trim, z.string().min(min, message));

export const registerSchema = z
  .object({
    accountType: AccountTypeEnum.default("CLIENT_ADHERENT"),

    // ADHERENT
    fullName: optionalTrimmedString,
    phone: requiredTrimmedString("Téléphone requis", 6),
    email: z.preprocess(trim, z.string().email("Email invalide")),
    country: requiredTrimmedString("Pays requis", 2),
    city: requiredTrimmedString("Ville requise", 2),
    password: z.string().min(8, "Mot de passe min 8 caractères"),
    confirmPassword: z.string().optional(),

    // ASSOCIATION
    companyName: optionalTrimmedString,
    phone2: optionalTrimmedString,
    commune: optionalTrimmedString,
    representativeType: z.string().optional().transform(trim),
    representativeName: optionalTrimmedString,
    representativePhone: optionalTrimmedString,
    representativeAddress: optionalTrimmedString,
    representativeEmail: optionalTrimmedString,

    acceptedConditions: z.boolean(),
  })
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
          message: "Nom de l’association requis",
        });
      }

      if (!AssociationCountryEnum.safeParse(data.country).success) {
        ctx.addIssue({
          code: "custom",
          path: ["country"],
          message: "Pays association invalide",
        });
      }

      if (!RepresentativeTypeEnum.safeParse(data.representativeType).success) {
        ctx.addIssue({
          code: "custom",
          path: ["representativeType"],
          message: "Type de représentant requis",
        });
      }

      [
        [
          "representativeName",
          data.representativeName,
          "Nom du représentant requis",
        ],
        [
          "representativePhone",
          data.representativePhone,
          "Téléphone du représentant requis",
        ],
        [
          "representativeAddress",
          data.representativeAddress,
          "Adresse du représentant requise",
        ],
      ].forEach(([path, value, message]) => {
        if (!value || value.length < 2) {
          ctx.addIssue({ code: "custom", path: [path], message });
        }
      });

      if (!data.representativeEmail) {
        ctx.addIssue({
          code: "custom",
          path: ["representativeEmail"],
          message: "Email du représentant requis",
        });
      } else if (
        !z.string().email().safeParse(data.representativeEmail).success
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["representativeEmail"],
          message: "Email du représentant invalide",
        });
      }

      if (!data.confirmPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["confirmPassword"],
          message: "Confirmation du mot de passe requise",
        });
      } else if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["confirmPassword"],
          message: "Les mots de passe ne correspondent pas",
        });
      }
    }
  });

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});
