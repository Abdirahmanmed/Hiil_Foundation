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
    // fieldname : "idDoc" | "selfie"
    const dir =
      file.fieldname === "selfie" ? "uploads/selfies" : "uploads/id_docs";
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
