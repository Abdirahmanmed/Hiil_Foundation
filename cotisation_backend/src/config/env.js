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

const hasBrevoApiKey = Boolean(process.env.BREVO_API_KEY);
const emailPort = parsePositiveInteger("EMAIL_PORT", 587);
const emailFrom = hasBrevoApiKey ? required("EMAIL_FROM") : process.env.EMAIL_FROM;
const emailHost = hasBrevoApiKey ? process.env.EMAIL_HOST : required("EMAIL_HOST");
const emailUser = hasBrevoApiKey ? process.env.EMAIL_USER : required("EMAIL_USER");
const emailPass = hasBrevoApiKey ? process.env.EMAIL_PASS : required("EMAIL_PASS");

export const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || "development",
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

  // OTP
  OTP_TTL_MINUTES: Number(process.env.OTP_TTL_MINUTES || 10),
  OTP_MAX_ATTEMPTS: Number(process.env.OTP_MAX_ATTEMPTS || 5),
  OTP_MAX_SEND_PER_HOUR: Number(process.env.OTP_MAX_SEND_PER_HOUR || 3),
  OTP_PEPPER: required("OTP_PEPPER"),

  // Brevo Transactional Email API (recommended on Render)
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  EMAIL_FROM: emailFrom,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || "Hiil Foundation",

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
};
