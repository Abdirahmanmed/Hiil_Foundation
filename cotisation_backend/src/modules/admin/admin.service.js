import prisma from "../../config/prisma.js";
import { auditLog } from "../../utils/audit.js";

export async function getDashboardStats() {
  const [totalUsers, activeUsers, totalSubscriptions, activeSubscriptions] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.subscription.count(),
      prisma.subscription.count({
        where: { status: { in: ["ACTIVE", "ACTIVE_MANUAL"] } },
      }),
    ]);

  return { totalUsers, activeUsers, totalSubscriptions, activeSubscriptions };
}

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      country: true,
      city: true,
      role: true,
      status: true,
      otpLockedUntil: true,
      otpSendCountHour: true,
      otpSendWindowStart: true,
      createdAt: true,
    },
  });
}

export async function listSubscriptions() {
  return prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true } },
    },
  });
}

/* =========================
   ACTIONS: USERS
   ========================= */

export async function setUserStatus({ adminId, userId, status, req }) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status },
    select: {
      id: true,
      status: true,
      role: true,
      fullName: true,
      email: true,
      phone: true,
    },
  });

  await auditLog({
    userId: adminId,
    action: "ADMIN_SET_USER_STATUS",
    entity: "User",
    entityId: updated.id,
    req,
    meta: { status },
  });

  return updated;
}

export async function setUserRole({ adminId, userId, role, req }) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: {
      id: true,
      status: true,
      role: true,
      fullName: true,
      email: true,
      phone: true,
    },
  });

  await auditLog({
    userId: adminId,
    action: "ADMIN_SET_USER_ROLE",
    entity: "User",
    entityId: updated.id,
    req,
    meta: { role },
  });

  return updated;
}

export async function resetUserOtpSecurity({ adminId, userId, req }) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      otpLockedUntil: null,
      otpSendCountHour: 0,
      otpSendWindowStart: null,
    },
    select: {
      id: true,
      otpLockedUntil: true,
      otpSendCountHour: true,
      otpSendWindowStart: true,
    },
  });

  await auditLog({
    userId: adminId,
    action: "ADMIN_RESET_OTP_SECURITY",
    entity: "User",
    entityId: userId,
    req,
  });

  return updated;
}

/* =========================
   ACTIONS: SUBSCRIPTIONS
   ========================= */

export async function setSubscriptionStatus({
  adminId,
  subscriptionId,
  status,
  req,
}) {
  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true } },
    },
  });

  await auditLog({
    userId: adminId,
    action: "ADMIN_SET_SUBSCRIPTION_STATUS",
    entity: "Subscription",
    entityId: subscriptionId,
    req,
    meta: { status },
  });

  return updated;
}

export async function forceSubscriptionConsent({
  adminId,
  subscriptionId,
  consentVersion,
  req,
}) {
  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      consentAccepted: true,
      consentVersion: consentVersion || "admin_force_v1",
      consentAt: new Date(),
      consentIp: req.ip,
      consentUserAgent: req.headers["user-agent"],
      // si c'était en attente, on active
      status: "ACTIVE",
    },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true } },
    },
  });

  await auditLog({
    userId: adminId,
    action: "ADMIN_FORCE_CONSENT",
    entity: "Subscription",
    entityId: subscriptionId,
    req,
    meta: { consentVersion: updated.consentVersion },
  });

  return updated;
}

/* =========================
   AUDIT LOGS
   ========================= */

export async function listAuditLogs({ query }) {
  const { userId, action, entity, from, to, limit = 50, offset = 0 } = query;

  const where = {
    ...(userId && { userId }),
    ...(action && { action }),
    ...(entity && { entity }),
    ...(from || to
      ? {
          createdAt: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: Number(offset),
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total };
}

/* =========================
   USER DETAILS (ADMIN)
   ========================= */

export async function getUserDetails({ userId }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        orderBy: { createdAt: "desc" },
      },
      otps: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!user) {
    const err = new Error("Utilisateur introuvable");
    err.status = 404;
    throw err;
  }

  return user;
}
