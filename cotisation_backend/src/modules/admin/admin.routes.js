import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import {
  dashboard,
  users,
  subscriptions,
  setUserStatus,
  setUserRole,
  resetUserOtp,
  setSubStatus,
  forceConsent,
  audit,
  userDetails,
} from "./admin.controller.js";

const router = Router();

// 🔒 ADMIN ONLY (tout le module)
router.use(auth, requireRole("ADMIN"));

// READ
router.get("/dashboard", dashboard);
router.get("/users", users);
router.get("/subscriptions", subscriptions);

// ACTIONS USERS
router.patch("/users/:userId/status", setUserStatus);
router.patch("/users/:userId/role", setUserRole);
router.post("/users/:userId/otp/reset", resetUserOtp);

// ACTIONS SUBSCRIPTIONS
router.patch("/subscriptions/:subscriptionId/status", setSubStatus);
router.post("/subscriptions/:subscriptionId/consent/force", forceConsent);
// AUDIT
router.get("/audit", audit);

// USER DETAILS
router.get("/users/:userId/details", userDetails);

export default router;
