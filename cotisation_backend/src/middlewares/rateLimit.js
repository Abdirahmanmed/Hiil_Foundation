import rateLimit, { ipKeyGenerator } from "express-rate-limit";

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
 * Connexion. La route n'avait aucun limiteur specifique, seulement le limiteur
 * global : une attaque par force brute sur le compte SUPER_ADMIN passait sous
 * le radar.
 *
 * La cle est composite IP + email, volontairement : une cle par email seul
 * permettrait a un attaquant de verrouiller tous les comptes qu'il connait
 * depuis une seule machine.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req)}:${String(req.body?.email || "").toLowerCase()}`,
  message: { message: "Trop de tentatives de connexion. Réessaie dans 15 minutes." },
});

/**
 * Formulaires de la vitrine publique (appel a projets, benevolat).
 * Assez large pour ne jamais gener un candidat legitime, assez strict pour
 * qu'un robot ne remplisse pas la table.
 */
export const publicFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 h
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de candidatures envoyées. Réessaie plus tard." },
});

/**
 * Acceptation d'une invitation : route publique qui prend un jeton en entree.
 * Stricte, parce qu'il n'y a aucune authentification en amont pour freiner un
 * essai de jetons a la chaine.
 */
/**
 * Renvoi d'une invitation : chaque appel invalide le jeton precedent.
 * Sans plafond, une boucle d'appels prive le titulaire de tout lien valable.
 */
export const inviteResendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de renvois d'invitation. Réessaie plus tard." },
});

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
