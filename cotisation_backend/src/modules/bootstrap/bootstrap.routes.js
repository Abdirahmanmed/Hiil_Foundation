import { Router } from "express";

import { auth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { inviteResendLimiter } from "../../middlewares/rateLimit.js";
import { CAN_BOOTSTRAP } from "../../config/roles.js";
import { listOugas, createOugas, resendOugasInvite } from "./bootstrap.controller.js";

const router = Router();

// 🔒 SUPER_ADMIN, et lui seul.
//
// C'est le seul routeur qu'il atteint : /api/admin, /api/expenses,
// /api/payment-orders et /api/treasury le refusent tous, parce que CAN_SUPERVISE,
// CAN_READ_MONEY, CAN_APPROVE et CAN_SEE_CASH ne le contiennent pas.
router.use(auth, requireRole(...CAN_BOOTSTRAP));

router.get("/ougas-admins", listOugas);
router.post("/ougas-admins", createOugas);

// Meme limiteur que l'invitation d'un compte interne, et pour la meme raison :
// chaque renvoi invalide le jeton precedent, donc une boucle d'appels empeche le
// titulaire de cliquer sur un lien encore valable.
router.post(
  "/ougas-admins/:userId/invite/resend",
  inviteResendLimiter,
  resendOugasInvite,
);

export default router;
