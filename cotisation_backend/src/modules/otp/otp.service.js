import prisma from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { generateOtpCode } from "../../utils/otp.js";
import { hashOtp } from "../../utils/hash.js";
import { sendOtpMail } from "../../services/mail.service.js";
import { auditLog } from "../../utils/audit.js";

// Un compte suspendu ou bloque ne doit pas pouvoir se reactiver seul.
// `/api/otp/send` et `/api/otp/verify` ne sont proteges par aucune
// authentification : sans cette garde, il suffisait de demander un code et de
// le saisir pour annuler une suspension prononcee par un ADMIN.
const OTP_BLOCKED_STATUSES = new Set(["SUSPENDED", "BLOCKED"]);

function refuse(user, { req, action, reason, message, status }) {
  auditLog({
    userId: user.id,
    action,
    entity: "User",
    entityId: user.id,
    req,
    meta: { reason, status: user.status },
  });

  const err = new Error(message);
  err.status = status;
  throw err;
}

function assertOtpAllowed(user, { req, action }) {
  if (OTP_BLOCKED_STATUSES.has(user.status)) {
    refuse(user, {
      req,
      action,
      reason: "ACCOUNT_" + user.status,
      message: "Ce compte est suspendu. Contactez l'administration.",
      status: 403,
    });
  }

  // Le parcours OTP appartient a l'inscription d'un MEMBRE. Un compte interne
  // s'active par son lien d'invitation, jamais par ici : le laisser passer le
  // ferait basculer en ACTIVE alors que son mot de passe est un hash aleatoire
  // que personne ne connait, et acceptInvitation refuserait ensuite le jeton
  // parce que le statut n'est plus PENDING_VERIFICATION. Le compte serait mort.
  if (user.role && user.role !== "CLIENT") {
    refuse(user, {
      req,
      action,
      reason: "INTERNAL_ACCOUNT",
      message:
        "Ce compte s'active depuis le lien d'invitation reçu par email.",
      status: 403,
    });
  }

  if (user.inviteTokenHash) {
    refuse(user, {
      req,
      action,
      reason: "INVITE_PENDING",
      message:
        "Ce compte s'active depuis le lien d'invitation reçu par email.",
      status: 403,
    });
  }
}

export const sendEmailOtp = async ({ email }, { req } = {}) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Utilisateur introuvable");
  assertOtpAllowed(user, { req, action: "OTP_SEND_DENIED_SUSPENDED" });
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

export const verifyEmailOtp = async ({ email, code }, { req } = {}) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Utilisateur introuvable");
  assertOtpAllowed(user, { req, action: "OTP_VERIFY_DENIED_SUSPENDED" });

  const userId = user.id;

  if (user.otpLockedUntil && user.otpLockedUntil > new Date()) {
    const err = new Error("OTP temporairement bloque. Reessayez plus tard.");
    err.status = 423;
    throw err;
  }

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
        // La verification d'un OTP ne fait qu'UNE chose au statut : elle sort du
        // PENDING_VERIFICATION. Elle ne "repare" jamais un compte suspendu.
        status: user.status === "PENDING_VERIFICATION" ? "ACTIVE" : user.status,
        otpSendCountHour: 0,
        otpLockedUntil: null,
      },
    }),
  ]);

  return true;
};
