import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { dashboard, create, list, approve } from "./expenses.controller.js";

const router = Router();
router.use(auth);

router.get("/dashboard", requireRole("GESTIONNAIRE_DEPENSE", "SUPER_ADMIN", "EQUIPE_TRESORERIE"), dashboard);
router.post("/", requireRole("GESTIONNAIRE_DEPENSE"), create);
router.get("/", requireRole("GESTIONNAIRE_DEPENSE", "SUPER_ADMIN", "EQUIPE_TRESORERIE"), list);
router.patch("/:id/approve", requireRole("GESTIONNAIRE_DEPENSE"), approve);

export default router;
