import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { create, list, print } from "./paymentOrders.controller.js";

const router = Router();
router.use(auth);

router.post("/", requireRole("EQUIPE_TRESORERIE"), create);
router.get("/", requireRole("EQUIPE_TRESORERIE", "SUPER_ADMIN"), list);
router.get("/:id/print", requireRole("EQUIPE_TRESORERIE", "SUPER_ADMIN"), print);

export default router;
