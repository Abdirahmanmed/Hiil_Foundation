import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { validate } from "../../middlewares/validate.js";
import { cacPaymentConfirmLimiter } from "../../middlewares/rateLimit.js";
import {
  confirmPaymentBodySchema,
  subscriptionPaymentParamsSchema,
} from "./cacPayments.schemas.js";
import {
  confirmSubscriptionPayment,
  getSubscriptionPaymentStatus,
  initiateSubscriptionPayment,
} from "./cacPayments.controller.js";

const router = Router();

router.use(auth, requireRole("CLIENT"));

router.post(
  "/subscriptions/:subscriptionId/initiate",
  validate({ params: subscriptionPaymentParamsSchema }),
  initiateSubscriptionPayment,
);

router.post(
  "/subscriptions/:subscriptionId/confirm",
  cacPaymentConfirmLimiter,
  validate({
    params: subscriptionPaymentParamsSchema,
    body: confirmPaymentBodySchema,
  }),
  confirmSubscriptionPayment,
);

router.get(
  "/subscriptions/:subscriptionId/status",
  validate({ params: subscriptionPaymentParamsSchema }),
  getSubscriptionPaymentStatus,
);

export default router;
