import prisma from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { generateOtpCode } from "../../utils/otp.js";
import { hashOtp, verifyPassword } from "../../utils/hash.js";
import { sendOtpMail } from "../../services/mail.service.js";

export const sendEmailOtp = async ({ email }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Utilisateur introuvable");
  const userId = user.id;

  // 🔒 Vérifier lock global
  if (user.otpLockedUntil && user.otpLockedUntil > new Date()) {
    throw new Error("OTP temporairement bloqué");
  }

  // ⏱ Fenêtre d’envoi par heure
  const now = new Date();
  let sendCount = user.otpSendCountHour;
  let windowStart = user.otpSendWindowStart;

  if (!windowStart || now - windowStart > 60 * 60 * 1000) {
    sendCount = 0;
    windowStart = now;
  }

  if (sendCount >= env.OTP_MAX_SEND_PER_HOUR) {
    throw new Error("Trop de demandes OTP. Réessayez plus tard.");
  }

  const otp = generateOtpCode();
  const codeHash = await hashOtp(otp);

  await prisma.$transaction([
    prisma.otp.create({
      data: {
        userId,
        channel: "EMAIL",
        codeHash,
        expiresAt: new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000),
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        otpSendCountHour: sendCount + 1,
        otpSendWindowStart: windowStart,
      },
    }),
  ]);

  await sendOtpMail({
    email: user.email,
    code: otp,
  });

  return true;
};

export const verifyEmailOtp = async ({ email, code }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Utilisateur introuvable");

  const userId = user.id;

  const otp = await prisma.otp.findFirst({
    where: {
      userId,
      channel: "EMAIL",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) throw new Error("OTP invalide ou expiré");

  if (otp.attempts >= env.OTP_MAX_ATTEMPTS) {
    await prisma.user.update({
      where: { id: userId },
      data: { otpLockedUntil: new Date(Date.now() + 60 * 60 * 1000) },
    });
    throw new Error("Trop de tentatives. OTP bloqué.");
  }

  // ✅ OTP = SHA256 compare
  const isValid = hashOtp(code) === otp.codeHash;

  if (!isValid) {
    await prisma.otp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error("OTP incorrect");
  }

  await prisma.$transaction([
    prisma.otp.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        status: "ACTIVE",
        otpSendCountHour: 0,
        otpLockedUntil: null,
      },
    }),
  ]);

  return true;
};
