import { z } from "zod";

/**
 * Aucun champ `role` ici, et c'est voulu.
 *
 * Le compte d'amorcage ne cree qu'une seule chose. Accepter un role dans le
 * corps de la requete — meme valide par un z.enum a une seule valeur — ouvrirait
 * la porte au jour ou quelqu'un elargit l'enum « pour faire simple ». Le role
 * est pose par le service, jamais par le client.
 */
export const createOugasAdminSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(1),
});

export const ougasAdminIdParamsSchema = z.object({
  userId: z.string().trim().min(1),
});
