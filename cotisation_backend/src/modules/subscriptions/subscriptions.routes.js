import { Router } from "express";
import {
  createSubscription,
  listMySubscriptions,
  getMySubscriptionById,
  acceptConsent,
  updateSubscription,
  cancelSubscription,
} from "./subscriptions.controller.js";

import { auth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/requireRole.js";

const router = Router();

// Cotiser est un acte de MEMBRE, pas de personnel interne.
// Sans requireRole("CLIENT"), n'importe quel compte connecte — gestionnaire de
// depense, tresorier, admin — pouvait creer une cotisation a son nom puis la
// consentir lui-meme, ce qui la faisait entrer dans les statistiques.
router.use(auth, requireRole("CLIENT"));

router.post("/", createSubscription);
router.get("/", listMySubscriptions);
router.get("/:id", getMySubscriptionById);
router.post("/:id/consent", acceptConsent);

// Un membre doit pouvoir corriger son engagement sans passer par le support,
// et l'arreter sans que ses versements passes disparaissent.
router.patch("/:id", updateSubscription);
router.post("/:id/cancel", cancelSubscription);

export default router;
