import prisma from "../../config/prisma.js";
import { auditLog } from "../../utils/audit.js";

function getPeriodStarts() {
  const now = new Date();
  return {
    monthStart: new Date(now.getFullYear(), now.getMonth(), 1),
    yearStart: new Date(now.getFullYear(), 0, 1),
  };
}

function expensePublicSelect() {
  return {
    id: true,
    createdAt: true,
    date: true,
    type: true,
    label: true,
    amount: true,
    beneficiaryName: true,
    beneficiaryCountry: true,
    beneficiaryCity: true,
    status: true,
    createdBy: { select: { id: true, fullName: true, companyName: true, email: true } },
  };
}

function paymentOrderPublicSelect() {
  return {
    id: true,
    createdAt: true,
    referenceNumber: true,
    paymentMethod: true,
    currency: true,
    paymentCountry: true,
    amount: true,
    status: true,
    expense: {
      select: {
        id: true,
        label: true,
        beneficiaryName: true,
        beneficiaryCountry: true,
        beneficiaryCity: true,
        status: true,
      },
    },
  };
}

function mapStatusRows(rows) {
  return rows.map((row) => ({
    status: row.status,
    count: row._count.status,
    amount: row._sum?.amount || 0,
  }));
}

export async function getDashboardStats({ role } = {}) {
  const { monthStart, yearStart } = getPeriodStarts();
  const subscriptionActiveWhere = { status: { in: ["ACTIVE", "ACTIVE_MANUAL"] } };
  const includeFinancials = role === "SUPER_ADMIN";

  const [
    totalUsers,
    activeUsers,
    adherentsCount,
    associationsCount,
    totalSubscriptions,
    activeSubscriptions,
    monthlySubscriptionsCount,
    annualSubscriptionsCount,
    monthlyCotisation,
    annualCotisation,
    totalCotisation,
    latestUsers,
    latestSubscriptions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { accountType: "CLIENT_ADHERENT" } }),
    prisma.user.count({ where: { accountType: "ASSOCIATION" } }),
    prisma.subscription.count(),
    prisma.subscription.count({ where: subscriptionActiveWhere }),
    prisma.subscription.count({ where: { ...subscriptionActiveWhere, createdAt: { gte: monthStart } } }),
    prisma.subscription.count({ where: { ...subscriptionActiveWhere, createdAt: { gte: yearStart } } }),
    prisma.subscription.aggregate({ where: { ...subscriptionActiveWhere, createdAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.subscription.aggregate({ where: { ...subscriptionActiveWhere, createdAt: { gte: yearStart } }, _sum: { amount: true } }),
    prisma.subscription.aggregate({ where: subscriptionActiveWhere, _sum: { amount: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        fullName: true,
        companyName: true,
        email: true,
        phone: true,
        accountType: true,
        role: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        amount: true,
        frequency: true,
        status: true,
        currency: true,
        paymentMethod: true,
        createdAt: true,
        user: { select: { id: true, fullName: true, companyName: true, email: true } },
      },
    }),
  ]);

  const stats = {
    totalUsers,
    activeUsers,
    adherentsCount,
    associationsCount,
    totalSubscriptions,
    activeSubscriptions,
    monthlySubscriptionsCount,
    annualSubscriptionsCount,
    monthlyCotisation: monthlyCotisation._sum.amount || 0,
    annualCotisation: annualCotisation._sum.amount || 0,
    totalCotisation: totalCotisation._sum.amount || 0,
    latestUsers,
    latestSubscriptions,
  };

  if (!includeFinancials) return stats;

  const [
    totalExpenses,
    expensesByStatus,
    pendingExpenses,
    approvedExpenses,
    rejectedExpenses,
    completedExpenses,
    latestExpenses,
    totalPaymentOrders,
    paymentOrdersAmount,
    latestPaymentOrders,
  ] = await Promise.all([
    prisma.expense.aggregate({ _count: true, _sum: { amount: true } }),
    prisma.expense.groupBy({ by: ["status"], _count: { status: true }, _sum: { amount: true } }),
    prisma.expense.count({ where: { status: "EN_ATTENTE" } }),
    prisma.expense.count({ where: { status: "APPROUVER" } }),
    prisma.expense.count({ where: { status: "REJETER" } }),
    prisma.expense.count({ where: { status: "EFFECTUER" } }),
    prisma.expense.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: expensePublicSelect() }),
    prisma.paymentOrder.count(),
    prisma.paymentOrder.aggregate({ _sum: { amount: true } }),
    prisma.paymentOrder.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: paymentOrderPublicSelect() }),
  ]);

  return {
    ...stats,
    totalExpenses: totalExpenses._sum.amount || 0,
    totalExpensesCount: totalExpenses._count,
    approvedExpenses,
    rejectedExpenses,
    pendingExpenses,
    completedExpenses,
    expensesByStatus: mapStatusRows(expensesByStatus),
    totalPaymentOrders,
    totalPaymentOrdersAmount: paymentOrdersAmount._sum.amount || 0,
    latestExpenses,
    latestPaymentOrders,
  };
}

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      accountType: true,
      companyName: true,
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
    select: {
      id: true,
      accountType: true,
      role: true,
      fullName: true,
      companyName: true,
      phone: true,
      phone2: true,
      email: true,
      country: true,
      city: true,
      commune: true,
      associationStatusDocPath: true,
      representativeType: true,
      representativeName: true,
      representativePhone: true,
      representativeAddress: true,
      representativeEmail: true,
      presidentIdDocPath: true,
      status: true,
      idDocPath: true,
      selfiePath: true,
      createdAt: true,
      updatedAt: true,
      subscriptions: {
        orderBy: { createdAt: "desc" },
      },
      otps: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          channel: true,
          expiresAt: true,
          attempts: true,
          usedAt: true,
          createdAt: true,
        },
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
