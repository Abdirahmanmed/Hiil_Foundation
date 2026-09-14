import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { CAN_SEE_CASH } from "../../config/roles.js";
import { dashboard } from "./treasury.controller.js";

const router = Router();

// Le SUPER_ADMIN arbitre les sorties d'argent : lui refuser la position de
// caisse revient a lui demander d'approuver a l'aveugle. La route ne contient
// que des agregations, l'ouvrir ne cree aucun risque d'ecriture.
router.use(auth, requireRole(...CAN_SEE_CASH));

router.get("/dashboard", dashboard);

export default router;
