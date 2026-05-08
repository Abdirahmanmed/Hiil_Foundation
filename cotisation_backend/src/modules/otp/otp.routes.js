import { Router } from "express";
import { sendOtp, verifyOtp } from "./otp.controller.js";
import { otpLimiter } from "../../middlewares/rateLimit.js";

const router = Router();

// 🔐 OTP protégé par rate-limit
router.post("/send", otpLimiter, sendOtp);
router.post("/verify", otpLimiter, verifyOtp);

export default router;
