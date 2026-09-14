import { z } from "zod";

const base = {
  fullName: z.string().trim().min(2, "Nom requis").max(120),
  email: z.string().trim().toLowerCase().email("Email invalide").max(200),
  // Champ piege : invisible pour un humain, rempli par la plupart des robots.
  // Volontairement ACCEPTE par zod — c'est le controleur qui repond 201 sans
  // rien ecrire. Le rejeter ici renverrait un 400 qui apprend au robot qu'il a
  // ete detecte. Il n'est jamais stocke.
  website: z.string().max(200).optional(),
};

export const publicSubmissionSchema = z.discriminatedUnion("kind", [
  z.object({
    ...base,
    kind: z.literal("PROJECT_PROPOSAL"),
    organization: z.string().trim().max(160).optional().or(z.literal("")),
    theme: z.string().trim().max(160).optional().or(z.literal("")),
    message: z.string().trim().min(10, "Décrivez votre projet").max(5000),
  }),
  z.object({
    ...base,
    kind: z.literal("VOLUNTEER"),
    skills: z.string().trim().max(500).optional().or(z.literal("")),
    availability: z.string().trim().max(300).optional().or(z.literal("")),
  }),
]);
