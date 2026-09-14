import { Router } from "express";
import { publicFormLimiter } from "../../middlewares/rateLimit.js";
import { submit } from "./publicForms.controller.js";

const router = Router();

// Volontairement publique : ces formulaires sont sur la vitrine, le candidat
// n'a evidemment pas de compte.
router.post("/submissions", publicFormLimiter, submit);

export default router;
