import crypto from "node:crypto";
import { env } from "../config/env.js";

/**
 * Le gestionnaire renvoyait `err.message` brut pour les 500, donc les messages
 * internes de Prisma ou de pg — nom de table, contrainte violee — remontaient
 * jusqu'au navigateur du client. Et symetriquement, le console.error etait
 * enferme dans `if (NODE_ENV !== "production")` : AUCUNE erreur de production
 * n'etait journalisee. On etait aveugle des deux cotes en meme temps.
 *
 * Nuance qui compte : on ne masque PAS toutes les erreurs. Les statuts
 * inferieurs a 500 portent des messages metier que l'interface affiche a
 * l'utilisateur (« La depense doit etre approuvee avant paiement »). Seul le
 * 500 est masque, et il porte un identifiant que le client lit au telephone et
 * qu'on colle dans le filtre de recherche des logs.
 */
export function errorHandler(err, req, res, next) {
  if (err?.name === "ZodError" || Array.isArray(err?.issues)) {
    return res.status(400).json({
      message: "Données invalides",
      errors: err.issues || [],
    });
  }

  // multer ne pose pas de .status : sans ce cas, un fichier trop gros
  // remontait en 500 au lieu d'un 413 exploitable.
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "Fichier trop volumineux." });
  }

  const status = err.status || 500;

  if (status >= 500) {
    const requestId = crypto.randomUUID();

    // Journalise TOUJOURS, production comprise.
    console.error(
      JSON.stringify({
        level: "error",
        requestId,
        method: req.method,
        path: req.originalUrl,
        userId: req.user?.id || null,
        role: req.user?.role || null,
        message: err?.message || String(err),
        code: err?.code || null,
        stack: env.NODE_ENV === "production" ? undefined : err?.stack,
      }),
    );

    return res.status(500).json({
      message: "Une erreur interne est survenue.",
      requestId,
    });
  }

  return res.status(status).json({
    message: err.message || "Erreur",
  });
}
