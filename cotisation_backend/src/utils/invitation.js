import crypto from "node:crypto";

import prisma from "../config/prisma.js";
import { hashInviteToken } from "./hash.js";

/** Duree de validite du lien d'invitation d'un compte interne. */
export const INVITE_TTL_HOURS = 168; // 7 jours

/**
 * Fabrique un jeton d'invitation et le renvoie EN CLAIR a l'appelant, qui doit
 * l'envoyer par email au titulaire. Seul son hash est conserve en base.
 *
 * Extrait de admin.service.js le jour ou le module bootstrap a eu besoin du
 * meme mecanisme : le compte d'amorcage invite l'Ougas Admin exactement comme
 * l'Ougas Admin invite un tresorier, et pour la meme raison — celui qui cree le
 * compte ne doit connaitre aucun secret permettant de s'y connecter.
 */
export async function issueInvitation(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      inviteTokenHash: hashInviteToken(token),
      inviteTokenExpiresAt: expiresAt,
    },
  });

  return { token, expiresAt };
}
