import { Router } from "express";
import { upload, validateUploadedFiles } from "../../utils/upload.js";
import { auth } from "../../middlewares/auth.js";
import {
  changePasswordLimiter,
  inviteAcceptLimiter,
  loginLimiter,
} from "../../middlewares/rateLimit.js";
import {
  register,
  login,
  me,
  changePassword,
  acceptInvite,
} from "./auth.controller.js";

const router = Router();

// multipart/form-data
router.post(
  "/register",
  upload.fields([
    { name: "idDoc", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
    { name: "presidentIdDoc", maxCount: 1 },
    { name: "associationStatusDoc", maxCount: 1 },
  ]),
  validateUploadedFiles,
  register,
);

router.post("/login", loginLimiter, login);

// Publique : le titulaire d'un compte interne n'est pas encore connecte.
router.post("/invite/accept", inviteAcceptLimiter, acceptInvite);
router.get("/me", auth, me);
router.patch("/change-password", auth, changePasswordLimiter, changePassword);

export default router;
