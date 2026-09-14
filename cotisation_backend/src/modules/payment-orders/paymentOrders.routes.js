import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { CAN_DISBURSE, CAN_READ_MONEY } from "../../config/roles.js";
import { create, list, markPrinted, print } from "./paymentOrders.controller.js";

const router = Router();
router.use(auth);

// LECTURE — l'ADMIN supervise le travail du tresorier, sans jamais y toucher.
router.get("/", requireRole(...CAN_READ_MONEY), list);
router.get("/:id/print", requireRole(...CAN_READ_MONEY), print);

// ECRITURE — le decaissement appartient au seul tresorier.
router.post("/", requireRole(...CAN_DISBURSE), create);
router.post("/:id/print", requireRole(...CAN_DISBURSE), markPrinted);

export default router;
