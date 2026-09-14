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

/**
 * Limiteur pour les changements de mot de passe authentifiés.
 */
export const changePasswordLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de tentatives. Réessaie plus tard." },
});

/**
 * Acceptation d'une invitation : route publique qui prend un jeton en entree.
 * Stricte, parce qu'il n'y a aucune authentification en amont pour freiner un
 * essai de jetons a la chaine.
 */
export const inviteAcceptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de tentatives. Réessaie plus tard." },
});

export const cacPaymentConfirmLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de tentatives OTP CAC. Reessaie plus tard." },
});
