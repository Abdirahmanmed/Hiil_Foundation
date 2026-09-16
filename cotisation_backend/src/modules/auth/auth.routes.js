import { Router } from "express";
import {
  upload,
  validateUploadedFiles,
  storeUploadsRemotely,
} from "../../utils/upload.js";
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
  forgotPassword,
  resetPassword,
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
  // L'ordre est le sujet : on ecrit sur le disque, on verifie les magic bytes
  // sur le fichier reel, ET SEULEMENT ENSUITE on envoie chez Cloudinary.
  validateUploadedFiles,
  storeUploadsRemotely,
  register,
);

router.post("/login", loginLimiter, login);

// Publique : le titulaire d'un compte interne n'est pas encore connecte.
router.post("/invite/accept", inviteAcceptLimiter, acceptInvite);

// Mot de passe oublie. Publiques par nature — quelqu'un qui a perdu son mot de
// passe ne peut evidemment pas s'authentifier. Meme limiteur que l'invitation :
// ces routes prennent un email ou un jeton en entree sans rien en amont.
router.post("/password/forgot", inviteAcceptLimiter, forgotPassword);
router.post("/password/reset", inviteAcceptLimiter, resetPassword);
router.get("/me", auth, me);
router.patch("/change-password", auth, changePasswordLimiter, changePassword);

export default router;
