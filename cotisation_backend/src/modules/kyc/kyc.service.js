import fs from "node:fs";
import path from "node:path";

import prisma from "../../config/prisma.js";
import { auditLog } from "../../utils/audit.js";
import { resolveStorageKey } from "../../utils/upload.js";
import { parseStorageKey, signedDocumentUrl } from "../../config/cloudinary.js";

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

  const cle = user[champ];
  const distant = parseStorageKey(cle);

  // Les deux stockages coexistent volontairement : les documents deposes avant
  // le passage a Cloudinary portent encore une cle locale, et rien ne justifie
  // de les rendre illisibles pour uniformiser un prefixe.
  const emplacement = distant
    ? ouvrirDistant(cle, distant)
    : ouvrirLocal(cle);

  // Journalise APRES avoir etabli que le document est atteignable, et avant de
  // renvoyer les octets : consulter la piece d'identite de quelqu'un est un
  // acte, pas un detail — mais un 404 n'en est pas un.
  await auditLog({
    userId: actor.id,
    action: "KYC_DOCUMENT_VIEWED",
    entity: "User",
    entityId: userId,
    req,
    meta: { docType, viewerRole: actor.role, storage: distant ? "cloudinary" : "local" },
  });

  return {
    ...emplacement,
    filename: `${docType.toLowerCase()}-${userId}${emplacement.extension}`,
  };
}

function typeMime(extension) {
  return TYPE_MIME[extension] || "application/octet-stream";
}

function ouvrirDistant(cle, { publicId }) {
  const url = signedDocumentUrl(cle);

  if (!url) {
    // Cloudinary n'est pas configure alors que la cle vient de lui : le
    // document existe, on ne sait simplement pas l'atteindre. Le dire, plutot
    // que de laisser croire a une disparition.
    const err = new Error(
      "Le stockage distant n'est pas configuré sur ce serveur : ce document est inaccessible.",
    );
    err.status = 503;
    throw err;
  }

  const extension = path.extname(publicId).toLowerCase();
  return { source: "cloudinary", url, extension, contentType: typeMime(extension) };
}

function ouvrirLocal(cle) {
  const absolu = resolveStorageKey(cle);

  if (!fs.existsSync(absolu)) {
    // Cas tres probable pour les documents anterieurs a Cloudinary : la ligne
    // existe en base, le fichier a disparu au redeploiement suivant.
    const err = new Error(
      "Le fichier n'est plus présent sur le serveur. Demandez à l'adhérent de le redéposer.",
    );
    err.status = 410;
    throw err;
  }

  const extension = path.extname(absolu).toLowerCase();
  return { source: "local", absolutePath: absolu, extension, contentType: typeMime(extension) };
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
