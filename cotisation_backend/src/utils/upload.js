import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";
import {
  destroyDocument,
  isCloudinaryEnabled,
  uploadDocument,
} from "../config/cloudinary.js";

const BACKEND_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

/**
 * Racine du stockage des documents.
 *
 * Les chemins etaient relatifs, donc resolus contre process.cwd() : cela ne
 * marchait que parce qu'on lance le serveur depuis cotisation_backend/. Un
 * superviseur qui redemarre le process avec un autre repertoire courant
 * envoyait les pieces d'identite ailleurs, sans erreur visible.
 *
 * UPLOAD_ROOT permet en prime de sortir le stockage du checkout git, donc de
 * le faire pointer vers un disque persistant.
 */
export const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_ROOT || BACKEND_ROOT);

/**
 * Cle de stockage a ecrire en base.
 *
 * Avec Cloudinary, storeUploadsRemotely a deja pose `storageKey` sur le fichier
 * et le fichier local n'existe plus. Sans Cloudinary — developpement seulement —
 * on retombe sur une cle relative a UPLOAD_ROOT : les chemins etaient absolus,
 * donc changer UPLOAD_ROOT rendait faux tout l'existant, et les antislashs
 * Windows se retrouvaient en base.
 */
export const toStorageKey = (file) =>
  file.storageKey || path.relative(UPLOAD_ROOT, file.path).split(path.sep).join("/");

/**
 * Resout une cle de stockage en chemin absolu, en refusant toute sortie de la
 * racine : sans ce controle, une cle contenant « ../ » lirait n'importe quel
 * fichier du serveur.
 */
export function resolveStorageKey(key) {
  const normalisee = String(key || "").split("\\").join("/");
  const absolu = path.resolve(UPLOAD_ROOT, normalisee);
  const racine = path.resolve(UPLOAD_ROOT) + path.sep;

  if (!absolu.startsWith(racine)) {
    const err = new Error("Chemin de document invalide");
    err.status = 400;
    throw err;
  }

  return absolu;
}

const ALLOWED = new Set(["image/jpeg", "image/png", "application/pdf"]);
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".pdf"]);
const MIME_BY_EXTENSION = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".pdf": "application/pdf",
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Les QUATRE documents vont dans private_uploads.
//
// Avant, `selfie` et `idDoc` tombaient dans `uploads/` par la branche par
// defaut : la piece d'identite d'un adherent etait donc MOINS protegee que
// celle d'un president d'association, sans aucune raison. Et « uploads »
// porte un nom qui invite a le servir en statique un jour de fatigue.
const SUBDIR_BY_FIELD = {
  selfie: "private_uploads/selfies",
  idDoc: "private_uploads/id_docs",
  presidentIdDoc: "private_uploads/president_id_docs",
  associationStatusDoc: "private_uploads/association_status_docs",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(
      UPLOAD_ROOT,
      SUBDIR_BY_FIELD[file.fieldname] || "private_uploads/divers",
    );
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}_${crypto.randomBytes(8).toString("hex")}${ext}`;
    cb(null, safeName);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: env.UPLOAD_MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED.has(file.mimetype) || MIME_BY_EXTENSION[ext] !== file.mimetype) {
      return cb(new Error("Type de fichier non autorisé"));
    }
    cb(null, true);
  },
});

function hasValidMagicBytes(filePath, mimetype) {
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(8);
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
    const bytes = buffer.subarray(0, bytesRead);

    if (mimetype === "image/jpeg") {
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    }
    if (mimetype === "image/png") {
      return bytes.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (mimetype === "application/pdf") {
      return bytes.subarray(0, 4).toString("ascii") === "%PDF";
    }
    return false;
  } finally {
    fs.closeSync(fd);
  }
}

export function validateUploadedFiles(req, res, next) {
  try {
    const files = Object.values(req.files || {}).flat();
    for (const file of files) {
      if (!hasValidMagicBytes(file.path, file.mimetype)) {
        for (const uploaded of files) {
          if (uploaded.path && fs.existsSync(uploaded.path)) fs.unlinkSync(uploaded.path);
        }
        return res.status(400).json({ message: "Type de fichier non autorisé" });
      }
    }
    next();
  } catch {
    return res.status(400).json({ message: "Fichier invalide" });
  }
}

function supprimerTemporaires(files) {
  for (const file of files) {
    try {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch {
      // Un temporaire qui resiste n'a pas a faire echouer une inscription
      // reussie : il sera repris au prochain redemarrage du disque ephemere.
    }
  }
}

/**
 * Efface tout ce qu'une requete a deja deposé, distant comme local.
 *
 * A appeler quand l'enregistrement echoue APRES le televersement : sans cela,
 * une inscription refusee — email deja pris, champ manquant — laisserait chez
 * Cloudinary une piece d'identite que plus aucune ligne en base ne designe.
 * Personne ne la retrouvera pour la supprimer, et elle y restera indefiniment.
 */
export async function discardUploads(files) {
  const liste = Object.values(files || {}).flat();
  if (!liste.length) return;

  await Promise.allSettled(
    liste.filter((f) => f.storageKey).map((f) => destroyDocument(f.storageKey)),
  );
  supprimerTemporaires(liste);
}

/**
 * Deplace les fichiers vers Cloudinary, apres validation et avant le controleur.
 *
 * L'ordre compte : le disque local reste l'aire de transit, parce que c'est lui
 * qui rend possible la verification des magic bytes sur un vrai fichier. Envoyer
 * d'abord et verifier ensuite reviendrait a stocker chez Cloudinary un fichier
 * dont on ne sait rien.
 *
 * En cas d'echec partiel, les documents deja televerses sont detruits : sinon
 * une inscription refusee laisserait derriere elle des pieces d'identite
 * orphelines, que plus aucune ligne en base ne designe et que personne ne
 * pensera jamais a supprimer.
 */
export async function storeUploadsRemotely(req, res, next) {
  const files = Object.values(req.files || {}).flat();

  if (!files.length || !isCloudinaryEnabled()) return next();

  const deposes = [];
  try {
    for (const file of files) {
      file.storageKey = await uploadDocument(file);
      deposes.push(file.storageKey);
    }
  } catch (err) {
    console.error("[upload] Cloudinary indisponible:", err?.message);
    await Promise.allSettled(deposes.map((key) => destroyDocument(key)));
    supprimerTemporaires(files);
    return res.status(502).json({
      message:
        "Le dépôt des documents a échoué. Réessayez dans un instant — aucune inscription n'a été enregistrée.",
    });
  }

  supprimerTemporaires(files);
  next();
}
