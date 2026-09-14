import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { inviteResendLimiter } from "../../middlewares/rateLimit.js";
import {
  dashboard,
  users,
  subscriptions,
  adherentsContributions,
  createInternalUser,
  setUserStatus,
  setUserRole,
  resetUserOtp,
  resendInvite,
  setSubStatus,
  forceConsent,
  oversight,
  audit,
  userDetails,
} from "./admin.controller.js";

const router = Router();

// 🔒 ADMIN / SUPER_ADMIN
router.use(auth, requireRole("ADMIN", "SUPER_ADMIN"));

// READ
router.get("/dashboard", dashboard);
router.get("/users", users);
router.get("/subscriptions", subscriptions);
router.get("/adherents-contributions", adherentsContributions);

// ACTIONS USERS
router.post("/users", createInternalUser);
router.patch("/users/:userId/status", setUserStatus);
router.patch("/users/:userId/role", requireRole("SUPER_ADMIN"), setUserRole);
router.post("/users/:userId/otp/reset", resetUserOtp);
// Limiteur : chaque renvoi invalide le jeton precedent. Sans plafond, une
// boucle d'appels empeche le titulaire de cliquer sur un lien encore valable.
router.post("/users/:userId/invite/resend", inviteResendLimiter, resendInvite);

// ACTIONS SUBSCRIPTIONS
// Forcer un statut de cotisation revient a declarer un engagement au nom d'un
// membre : ACTIVE_MANUAL sans consentement produit exactement le meme resultat
// que le forcage de consentement ci-dessous. Les deux relevent de la meme
// autorite, sinon le verrou de l'un se contourne par l'autre.
router.patch(
  "/subscriptions/:subscriptionId/status",
  requireRole("SUPER_ADMIN"),
  setSubStatus,
);

// Forcer un consentement inscrit l'IP et le user-agent de CELUI QUI CLIQUE dans
// les champs de preuve du membre : l'application fabrique une preuve juridique
// d'adhesion au nom de quelqu'un d'autre. Ce n'est pas un acte de supervision.
router.post(
  "/subscriptions/:subscriptionId/consent/force",
  requireRole("SUPER_ADMIN"),
  forceConsent,
);
// SUPERVISION — lecture seule, par construction : c'est un GET, et le service
// ne contient que des agregations et des findMany.
router.get("/oversight", oversight);

// AUDIT
router.get("/audit", audit);

// USER DETAILS
router.get("/users/:userId/details", userDetails);

export default router;
