import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { CAN_APPROVE, CAN_DISBURSE, CAN_READ_MONEY } from "../../config/roles.js";
import {
  create,
  list,
  markPrinted,
  markExecuted,
  cancel,
  print,
} from "./paymentOrders.controller.js";

const router = Router();
router.use(auth);

// LECTURE — l'ADMIN supervise le travail du tresorier, sans jamais y toucher.
router.get("/", requireRole(...CAN_READ_MONEY), list);
router.get("/:id/print", requireRole(...CAN_READ_MONEY), print);

// ECRITURE — le decaissement appartient au seul tresorier.
router.post("/", requireRole(...CAN_DISBURSE), create);
router.post("/:id/print", requireRole(...CAN_DISBURSE), markPrinted);
router.post("/:id/execute", requireRole(...CAN_DISBURSE), markExecuted);

// ANNULATION — la route admet les deux roles, le service tranche selon l'etat :
// un ordre CREE s'annule en tresorerie, un ordre IMPRIME exige le Super Admin,
// un ordre EXECUTE ne s'annule jamais.
router.post("/:id/cancel", requireRole(...CAN_DISBURSE, ...CAN_APPROVE), cancel);

export default router;
