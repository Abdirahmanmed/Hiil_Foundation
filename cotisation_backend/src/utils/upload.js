import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { env } from "../config/env.js";

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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // fieldname : "idDoc" | "selfie" | "presidentIdDoc" | "associationStatusDoc"
    const dir =
      file.fieldname === "selfie"
        ? "uploads/selfies"
        : file.fieldname === "presidentIdDoc"
          ? "private_uploads/president_id_docs"
          : file.fieldname === "associationStatusDoc"
            ? "private_uploads/association_status_docs"
            : "uploads/id_docs";
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
