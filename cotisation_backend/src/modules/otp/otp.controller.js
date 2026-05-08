import * as otpService from "./otp.service.js";
import { sendOtpSchema, verifyOtpSchema } from "./otp.schemas.js";

export const sendOtp = async (req, res, next) => {
  try {
    const data = sendOtpSchema.parse(req.body);
    await otpService.sendEmailOtp(data); // {email}
    res.json({ message: "OTP envoyé par email" });
  } catch (err) {
    next(err);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const data = verifyOtpSchema.parse(req.body);
    await otpService.verifyEmailOtp(data); // {email, code}
    res.json({ message: "OTP vérifié avec succès" });
  } catch (err) {
    next(err);
  }
};
