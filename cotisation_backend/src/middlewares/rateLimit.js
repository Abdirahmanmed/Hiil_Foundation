import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});

/**
 * Limiteur spécifique OTP (plus strict)
 * Exemple: 10 requêtes / 5 minutes par IP
 */
export const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many OTP requests. Try again later." },
});
