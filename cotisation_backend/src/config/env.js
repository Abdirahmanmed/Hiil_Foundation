import "dotenv/config";

function parseBoolean(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  if (["true", "1", "yes", "on"].includes(value.toLowerCase())) return true;
  if (["false", "0", "no", "off"].includes(value.toLowerCase())) return false;
  throw new Error(`❌ Variable d’environnement invalide : ${name} doit être true ou false`);
}

function required(name) {
  if (!process.env[name]) {
    throw new Error(`❌ Variable d’environnement manquante : ${name}`);
  }
  return process.env[name];
}

function parsePositiveInteger(name, fallback) {
  const rawValue = process.env[name];
  const value = rawValue === undefined || rawValue === "" ? fallback : Number(rawValue);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`❌ Variable d’environnement invalide : ${name} doit être un entier positif`);
  }

  return value;
}

function parseOptionalPositiveInteger(name) {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue === "") return undefined;

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`❌ Variable d’environnement invalide : ${name} doit être un entier positif`);
  }

  return value;
}

const nodeEnv = process.env.NODE_ENV || "development";

/**
 * Le mode "mock" accepte un OTP constant : c'est un defaut OUVERT.
 * Il ne doit jamais s'appliquer par omission sur un serveur de production —
 * un oubli de variable transformerait silencieusement l'encaissement reel en
 * simulation. En production, le choix doit donc etre explicite.
 */
function resolvePaymentMode() {
  const raw = process.env.CAC_PAYMENT_MODE;

  if (!raw) {
    if (nodeEnv === "production") {
      throw new Error(
        "❌ CAC_PAYMENT_MODE doit être défini explicitement (mock ou live) en production",
      );
    }
    return "mock";
  }

  if (!["mock", "live"].includes(raw)) {
    throw new Error(
      "❌ Variable d’environnement invalide : CAC_PAYMENT_MODE doit être mock ou live",
    );
  }

  return raw;
}

const cacPaymentMode = resolvePaymentMode();

/**
 * Ou vivent les pieces d'identite.
 *
 * Le disque de Render est ephemere : un deploiement efface tous les documents
 * deja deposes, en laissant en base des lignes qui pointent vers rien. Le defaut
 * silencieux — « ca marche en local » — est donc exactement le piege a eviter en
 * production, d'ou le refus de demarrer plutot que la perte differee.
 */
function resolveDocumentStorage() {
  const parTrois = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );

  // Le tableau de bord Cloudinary donne CLOUDINARY_URL en une seule chaine :
  // c'est la forme la plus simple a coller dans Render, on l'accepte telle quelle.
  if (parTrois || process.env.CLOUDINARY_URL) return "cloudinary";

  if (nodeEnv === "production") {
    throw new Error(
      "❌ Stockage des documents non configuré : renseigne CLOUDINARY_URL, " +
        "ou CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET. " +
        "Sans Cloudinary, les pièces d'identité disparaissent au prochain déploiement.",
    );
  }

  return "local";
}

const documentStorage = resolveDocumentStorage();

// En live, on echoue au DEMARRAGE plutot qu'a la premiere requete de paiement :
// un serveur qui demarre est un serveur qu'on croit fonctionnel.
if (cacPaymentMode === "live") {
  for (const name of [
    "CAC_BASE_URL",
    "CAC_USERNAME",
    "CAC_PASSWORD",
    "CAC_APP_KEY",
    "CAC_API_KEY",
    "CAC_COMPANY_SERVICE_ID",
  ]) {
    required(name);
  }
}

const hasBrevoApiKey = Boolean(process.env.BREVO_API_KEY);
const emailPort = parsePositiveInteger("EMAIL_PORT", 587);
const emailFrom = hasBrevoApiKey ? required("EMAIL_FROM") : process.env.EMAIL_FROM;
const emailHost = hasBrevoApiKey ? process.env.EMAIL_HOST : required("EMAIL_HOST");
const emailUser = hasBrevoApiKey ? process.env.EMAIL_USER : required("EMAIL_USER");
const emailPass = hasBrevoApiKey ? process.env.EMAIL_PASS : required("EMAIL_PASS");

export const env = {
  // Server
  NODE_ENV: nodeEnv,
  PORT: Number(process.env.PORT || 4000),

  // Database (Neon)
  DATABASE_URL: required("DATABASE_URL"),

  // JWT
  JWT_ACCESS_SECRET: required("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET"),
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || "15m",
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || "7d",

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",

  // Base des liens envoyes par email (invitation d'un compte interne).
  // Par defaut l'origine du front, qui est deja connue via CORS_ORIGIN.
  APP_PUBLIC_URL: (
    process.env.APP_PUBLIC_URL ||
    process.env.CORS_ORIGIN ||
    "http://localhost:5173"
  ).replace(/\/+$/, ""),

  // OTP
  OTP_TTL_MINUTES: Number(process.env.OTP_TTL_MINUTES || 10),
  OTP_MAX_ATTEMPTS: Number(process.env.OTP_MAX_ATTEMPTS || 5),
  OTP_MAX_SEND_PER_HOUR: Number(process.env.OTP_MAX_SEND_PER_HOUR || 3),
  OTP_PEPPER: required("OTP_PEPPER"),

  // Brevo Transactional Email API (recommended on Render)
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  EMAIL_FROM: emailFrom,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || "Hiil Foundation",

  // Destinataire interne des candidatures deposees sur la vitrine.
  // Par defaut l'adresse d'envoi, qui est deja validee cote Brevo.
  CONTACT_EMAIL: process.env.CONTACT_EMAIL || emailFrom,

  // EMAIL SMTP fallback (used only when BREVO_API_KEY is absent)
  EMAIL_HOST: emailHost,
  EMAIL_PORT: emailPort,
  EMAIL_SECURE: parseBoolean("EMAIL_SECURE", emailPort === 465),
  EMAIL_USER: emailUser,
  EMAIL_PASS: emailPass,
  EMAIL_CONNECTION_TIMEOUT_MS: parsePositiveInteger("EMAIL_CONNECTION_TIMEOUT_MS", 30_000),
  EMAIL_GREETING_TIMEOUT_MS: parsePositiveInteger("EMAIL_GREETING_TIMEOUT_MS", 30_000),
  EMAIL_SOCKET_TIMEOUT_MS: parsePositiveInteger("EMAIL_SOCKET_TIMEOUT_MS", 60_000),

  // Upload
  UPLOAD_MAX_MB: Number(process.env.UPLOAD_MAX_MB || 10),

  // "cloudinary" ou "local". Voir resolveDocumentStorage() ci-dessus : "local"
  // est impossible en production.
  DOCUMENT_STORAGE: documentStorage,

  // CAC Bank Payment API
  CAC_BASE_URL: process.env.CAC_BASE_URL,
  CAC_USERNAME: process.env.CAC_USERNAME,
  CAC_PASSWORD: process.env.CAC_PASSWORD,
  CAC_APP_KEY: process.env.CAC_APP_KEY,
  CAC_API_KEY: process.env.CAC_API_KEY,
  CAC_COMPANY_SERVICE_ID: parseOptionalPositiveInteger("CAC_COMPANY_SERVICE_ID"),
  CAC_CURRENCY: process.env.CAC_CURRENCY || "DJF",
  CAC_PAYMENT_MODE: cacPaymentMode,
};
