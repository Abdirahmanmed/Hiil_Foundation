import { Router } from "express";
import { upload, validateUploadedFiles } from "../../utils/upload.js";
import { auth } from "../../middlewares/auth.js";
import { register, login, me } from "./auth.controller.js";

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

router.post("/login", login);
router.get("/me", auth, me);

export default router;
