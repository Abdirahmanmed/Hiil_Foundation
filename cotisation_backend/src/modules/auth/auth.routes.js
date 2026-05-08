import { Router } from "express";
import { upload } from "../../utils/upload.js";
import { auth } from "../../middlewares/auth.js";
import { register, login, me } from "./auth.controller.js";

const router = Router();

// multipart/form-data
router.post(
  "/register",
  upload.fields([
    { name: "idDoc", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  register,
);

router.post("/login", login);
router.get("/me", auth, me);

export default router;
