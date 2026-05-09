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

const emailPort = Number(process.env.EMAIL_PORT || 587);

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

  // EMAIL (OTP)
  EMAIL_HOST: required("EMAIL_HOST"),
  EMAIL_PORT: emailPort,
  EMAIL_SECURE: parseBoolean("EMAIL_SECURE", emailPort === 465),
  EMAIL_USER: required("EMAIL_USER"),
  EMAIL_PASS: required("EMAIL_PASS"),

  // Upload
  UPLOAD_MAX_MB: Number(process.env.UPLOAD_MAX_MB || 10),
};
