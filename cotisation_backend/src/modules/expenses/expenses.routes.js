import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import {
  CAN_ENGAGE,
  CAN_APPROVE,
  CAN_READ_MONEY,
  CAN_SUPERVISE,
} from "../../config/roles.js";
import { dashboard, create, list, trail, approve, reject } from "./expenses.controller.js";

const router = Router();

router.use(auth);

// LECTURE — l'ADMIN est ici, et nulle part ailleurs dans ce fichier.
// Le perimetre reel de chaque role est derive par expenseScopeFor().
router.get("/dashboard", requireRole(...CAN_READ_MONEY), dashboard);
router.get("/", requireRole(...CAN_READ_MONEY), list);
router.get("/:id/trail", requireRole(...CAN_SUPERVISE), trail);

// ECRITURE — trois verbes, trois roles disjoints. Ne jamais y ajouter ADMIN.
router.post("/", requireRole(...CAN_ENGAGE), create);
router.patch("/:id/approve", requireRole(...CAN_APPROVE), approve);
router.patch("/:id/reject", requireRole(...CAN_APPROVE), reject);

export default router;
