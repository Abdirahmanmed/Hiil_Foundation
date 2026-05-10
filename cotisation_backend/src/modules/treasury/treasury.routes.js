import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { dashboard } from "./treasury.controller.js";

const router = Router();
router.use(auth, requireRole("EQUIPE_TRESORERIE"));

router.get("/dashboard", dashboard);

export default router;
