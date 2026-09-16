import crypto from "node:crypto";
import path from "node:path";

import { v2 as cloudinary } from "cloudinary";

import { env } from "./env.js";

/**
 * Stockage des pieces d'identite chez Cloudinary.
 *
 * Le disque de Render est ephemere : les documents deposes a l'inscription
 * disparaissaient au redeploiement suivant, et la seule trace restante etait une
 * ligne en base pointant vers un fichier absent. Un KYC qui s'efface tout seul
 * ne verifie rien.
 *
 * Trois choix, et leurs raisons :
 *
 *   type: "authenticated"  — l'URL publique d'un document d'identite serait
 *     lisible par quiconque la recupere, indefiniment. En « authenticated », la
 *     ressource n'est servie que contre une URL signee avec le secret du compte.
 *
 *   resource_type: "raw"   — aucune transformation, aucune conversion de format,
 *     les octets exacts reviennent. En « image », Cloudinary traite les PDF a
 *     part et leur livraison depend d'un reglage de compte qu'on ne controle pas
 *     depuis le code : un justificatif PDF cesserait d'etre lisible sans que
 *     rien dans le depot n'ait change.
 *
 *   l'URL signee n'est JAMAIS renvoyee au navigateur — le serveur va chercher
 *     le fichier et le retransmet lui-meme. C'est ce qui garde la trace d'audit
 *     a chaque consultation et empeche une URL de circuler par copier-coller.
 */

const ACTIF = env.DOCUMENT_STORAGE === "cloudinary";

if (ACTIF) {
  const triple = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  };

  // Le SDK lit CLOUDINARY_URL tout seul ; on ne surcharge que si les trois
  // variables separees sont fournies, sinon on ecraserait sa configuration avec
  // des undefined.
  cloudinary.config(
    triple.cloud_name && triple.api_key && triple.api_secret
      ? { ...triple, secure: true }
      : { secure: true },
  );
}

export const isCloudinaryEnabled = () => ACTIF;

const PREFIXE = "cloudinary";
const SEPARATEUR = "|";

/** `cloudinary|raw|hiil/kyc/id_docs/ab12….pdf` */
export function buildStorageKey({ resourceType, publicId }) {
  return [PREFIXE, resourceType, publicId].join(SEPARATEUR);
}

/** Renvoie null pour une clé locale, pour que l'appelant garde l'ancien chemin. */
export function parseStorageKey(key) {
  const brut = String(key || "");
  if (!brut.startsWith(`${PREFIXE}${SEPARATEUR}`)) return null;

  const [, resourceType, ...reste] = brut.split(SEPARATEUR);
  const publicId = reste.join(SEPARATEUR);
  if (!resourceType || !publicId) return null;

  return { resourceType, publicId };
}

const DOSSIER_PAR_CHAMP = {
  selfie: "hiil/kyc/selfies",
  idDoc: "hiil/kyc/id_docs",
  presidentIdDoc: "hiil/kyc/president_id_docs",
  associationStatusDoc: "hiil/kyc/association_status_docs",
};

/**
 * Televerse un fichier deja valide (extension, MIME et magic bytes verifies par
 * validateUploadedFiles) et renvoie la cle a stocker en base.
 */
export async function uploadDocument(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const dossier = DOSSIER_PAR_CHAMP[file.fieldname] || "hiil/kyc/divers";
  const nom = `${Date.now()}_${crypto.randomBytes(8).toString("hex")}${ext}`;

  const reponse = await cloudinary.uploader.upload(file.path, {
    folder: dossier,
    // En resource_type "raw", l'extension fait partie du public_id : elle doit
    // donc figurer dans le nom, sinon le fichier revient sans type exploitable.
    public_id: nom,
    resource_type: "raw",
    type: "authenticated",
    overwrite: false,
    use_filename: false,
    unique_filename: false,
    invalidate: false,
  });

  return buildStorageKey({
    resourceType: reponse.resource_type,
    publicId: reponse.public_id,
  });
}

/** Supprime un document déjà téléversé. Utilisé pour nettoyer un lot partiel. */
export async function destroyDocument(key) {
  const ref = parseStorageKey(key);
  if (!ref) return;

  await cloudinary.uploader.destroy(ref.publicId, {
    resource_type: ref.resourceType,
    type: "authenticated",
    invalidate: true,
  });
}

/**
 * URL signee, a usage strictement interne au serveur. Elle ne doit jamais
 * atteindre un navigateur : c'est un acces direct au document, sans passer par
 * le controle de role ni par le journal d'audit.
 */
export function signedDocumentUrl(key) {
  const ref = parseStorageKey(key);
  if (!ref) return null;

  return cloudinary.url(ref.publicId, {
    resource_type: ref.resourceType,
    type: "authenticated",
    sign_url: true,
    secure: true,
  });
}
