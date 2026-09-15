import fs from "node:fs";
import path from "node:path";

import prisma from "../../config/prisma.js";
import { auditLog } from "../../utils/audit.js";
import { resolveStorageKey } from "../../utils/upload.js";

/**
 * Consultation des documents d'identite.
 *
 * Ils etaient collectes, valides jusqu'aux magic bytes, ranges sur le disque…
 * et JAMAIS relus : aucun express.static, aucun sendFile, aucun res.download
 * dans tout src/. L'administration ne voyait meme pas un nom de fichier pour un
 * adherent. Un KYC qu'on ne peut pas consulter ne verifie rien.
 */

const CHAMP_PAR_TYPE = {
  ID_DOC: "idDocPath",
  SELFIE: "selfiePath",
  PRESIDENT_ID_DOC: "presidentIdDocPath",
  ASSOCIATION_STATUS_DOC: "associationStatusDocPath",
};

const TYPE_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".pdf": "application/pdf",
};

/**
 * Ouvre un document pour lecture.
 *
 * Trois gardes, dans cet ordre : le role doit etre habilite (fait par la
 * route), la cle doit appartenir a l'utilisateur demande (donc pas de lecture
 * croisee via un identifiant devine), et le chemin resolu doit rester sous la
 * racine de stockage — sans ce dernier controle, une cle contenant « ../ »
 * lirait n'importe quel fichier du serveur.
 *
 * Chaque consultation est journalisee : lire la piece d'identite de quelqu'un
 * est un acte, pas un detail.
 */
export async function openKycDocument({ actor, userId, docType, req }) {
  const champ = CHAMP_PAR_TYPE[docType];
  if (!champ) {
    const err = new Error("Type de document inconnu");
    err.status = 400;
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, [champ]: true },
  });

  if (!user || !user[champ]) {
    const err = new Error("Document introuvable");
    err.status = 404;
    throw err;
  }

  const absolu = resolveStorageKey(user[champ]);

  if (!fs.existsSync(absolu)) {
    // Cas tres probable sur un hebergement au systeme de fichiers ephemere :
    // la ligne existe en base, le fichier a disparu au redeploiement.
    const err = new Error(
      "Le fichier n'est plus présent sur le serveur. Demandez à l'adhérent de le redéposer.",
    );
    err.status = 410;
    throw err;
  }

  await auditLog({
    userId: actor.id,
    action: "KYC_DOCUMENT_VIEWED",
    entity: "User",
    entityId: userId,
    req,
    meta: { docType, viewerRole: actor.role },
  });

  return {
    absolutePath: absolu,
    contentType: TYPE_MIME[path.extname(absolu).toLowerCase()] || "application/octet-stream",
    filename: `${docType.toLowerCase()}-${userId}${path.extname(absolu)}`,
  };
}

/** Ce que le back-office peut savoir des documents d'un membre, sans les ouvrir. */
export async function listKycDocuments({ userId }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      accountType: true,
      idDocPath: true,
      selfiePath: true,
      presidentIdDocPath: true,
      associationStatusDocPath: true,
    },
  });

  if (!user) {
    const err = new Error("Utilisateur introuvable");
    err.status = 404;
    throw err;
  }

  return Object.entries(CHAMP_PAR_TYPE)
    .filter(([, champ]) => Boolean(user[champ]))
    .map(([docType, champ]) => ({
      docType,
      // On expose l'existence et le nom de fichier, jamais le chemin complet.
      filename: String(user[champ]).split("/").pop(),
      url: `/api/kyc/${user.id}/${docType}`,
    }));
}
