import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import {
  dashboard,
  users,
  subscriptions,
  adherentsContributions,
  createInternalUser,
  setUserStatus,
  setUserRole,
  resetUserOtp,
  setSubStatus,
  forceConsent,
  audit,
  userDetails,
} from "./admin.controller.js";

const router = Router();

// 🔒 ADMIN / SUPER_ADMIN
router.use(auth, requireRole("ADMIN", "SUPER_ADMIN"));

// READ
router.get("/dashboard", dashboard);
router.get("/users", users);
router.get("/subscriptions", subscriptions);
router.get("/adherents-contributions", adherentsContributions);

// ACTIONS USERS
router.post("/users", createInternalUser);
router.patch("/users/:userId/status", setUserStatus);
router.patch("/users/:userId/role", requireRole("SUPER_ADMIN"), setUserRole);
router.post("/users/:userId/otp/reset", resetUserOtp);

// ACTIONS SUBSCRIPTIONS
router.patch("/subscriptions/:subscriptionId/status", setSubStatus);
router.post("/subscriptions/:subscriptionId/consent/force", forceConsent);
// AUDIT
router.get("/audit", audit);

// USER DETAILS
router.get("/users/:userId/details", userDetails);

export default router;
