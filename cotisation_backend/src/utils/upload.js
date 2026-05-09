import multer from "multer";
import path from "path";
import fs from "fs";
import { env } from "../config/env.js";

const ALLOWED = new Set(["image/jpeg", "image/png", "application/pdf"]);

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
    const safeName = `${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`;
    cb(null, safeName);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: env.UPLOAD_MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.has(file.mimetype))
      return cb(new Error("Type de fichier non autorisé"));
    cb(null, true);
  },
});
