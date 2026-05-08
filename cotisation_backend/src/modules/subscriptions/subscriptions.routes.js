import { Router } from "express";
import {
  createSubscription,
  listMySubscriptions,
  getMySubscriptionById,
  acceptConsent,
} from "./subscriptions.controller.js";

import { auth } from "../../middlewares/auth.js";

const router = Router();

// Client must be authenticated
router.use(auth);

router.post("/", createSubscription);
router.get("/", listMySubscriptions);
router.get("/:id", getMySubscriptionById);
router.post("/:id/consent", acceptConsent);

export default router;
