import crypto from "node:crypto";

import prisma from "../../config/prisma.js";
import { CAN_SUPERVISE } from "../../config/roles.js";
import { invalidateUserCache } from "../../middlewares/auth.js";
import { auditLog } from "../../utils/audit.js";
import { hashInviteToken, hashUnusablePassword } from "../../utils/hash.js";
import { sendInternalInviteMail } from "../../services/mail.service.js";

const VISIBLE_INTERNAL_USER_ROLES = [
  "ADMIN",
  "GESTIONNAIRE_DEPENSE",
  "EQUIPE_TRESORERIE",
];

const CREATABLE_INTERNAL_ROLES = VISIBLE_INTERNAL_USER_ROLES;

const ADMIN_CREATABLE_INTERNAL_ROLES = [
  "GESTIONNAIRE_DEPENSE",
  "EQUIPE_TRESORERIE",
];

function userPublicSelect() {
  return {
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
  };
}

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
  // L'ADMIN supervise le deroulement du travail du tresorier et du depensier :
  // il lui faut les chiffres consolides. Superviser sans voir les montants n'est
  // pas superviser. Il reste en lecture seule : aucune route d'ecriture des
  // modules expenses / payment-orders ne le mentionne.
  const includeFinancials = CAN_SUPERVISE.includes(role);

  const [
    totalUsers,
    activeUsers,
    internalUsersCount,
    adherentsCount,
    associationsCount,
    expenseManagersCount,
    treasuryUsersCount,
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
    prisma.user.count({ where: { role: { in: VISIBLE_INTERNAL_USER_ROLES } } }),
    prisma.user.count({ where: { role: "CLIENT", accountType: "CLIENT_ADHERENT" } }),
    prisma.user.count({ where: { role: "CLIENT", accountType: "ASSOCIATION" } }),
    prisma.user.count({ where: { role: "GESTIONNAIRE_DEPENSE" } }),
    prisma.user.count({ where: { role: "EQUIPE_TRESORERIE" } }),
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
    internalUsersCount,
    adherentsCount,
    associationsCount,
    expenseManagersCount,
    treasuryUsersCount,
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
    paymentOrdersByStatus,
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
    prisma.paymentOrder.groupBy({ by: ["status"], _count: { status: true }, _sum: { amount: true } }),
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
    paymentOrdersByStatus: mapStatusRows(paymentOrdersByStatus),
    latestExpenses,
    latestPaymentOrders,
  };
}

export async function listUsers() {
  return prisma.user.findMany({
    where: { role: { in: VISIBLE_INTERNAL_USER_ROLES } },
    orderBy: { createdAt: "desc" },
    select: userPublicSelect(),
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

export async function listAdherentsContributions() {
  const subscriptions = await prisma.subscription.findMany({
    where: { user: { role: "CLIENT" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      paymentMethod: true,
      amount: true,
      currency: true,
      status: true,
      createdAt: true,
      paidAt: true,
      user: {
        select: {
          id: true,
          accountType: true,
          fullName: true,
          companyName: true,
          phone: true,
          country: true,
          city: true,
        },
      },
    },
  });

  return subscriptions.map((subscription) => ({
    id: subscription.id,
    name:
      subscription.user?.accountType === "ASSOCIATION"
        ? subscription.user?.companyName || subscription.user?.fullName || ""
        : subscription.user?.fullName || subscription.user?.companyName || "",
    phone: subscription.user?.phone || "",
    country: subscription.user?.country || "",
    city: subscription.user?.city || "",
    paymentMethod: subscription.paymentMethod,
    amount: subscription.amount,
    currency: subscription.currency,
    status: subscription.status,
    // La date de creation de l'engagement n'est PAS une date d'encaissement.
    // Renvoyer l'une a la place de l'autre faisait passer chaque cotisation
    // declaree pour une cotisation payee dans l'ecran des contributions.
    // `paidAt` n'est alimente que par un paiement CAC confirme ; ailleurs il est
    // null, et c'est la verite tant que la vague 2 n'a pas separe l'engagement
    // de l'encaissement.
    declaredAt: subscription.createdAt,
    paidAt: subscription.paidAt ?? null,
  }));
}

/* =========================
   ACTIONS: USERS
   ========================= */

function assertCanCreateInternalUser({ adminRole, role }) {
  if (role === "SUPER_ADMIN") {
    throw createHttpError("SUPER_ADMIN ne peut pas être créé depuis l'interface", 403);
  }

  if (!CREATABLE_INTERNAL_ROLES.includes(role)) {
    throw createHttpError("Rôle interne non autorisé", 400);
  }

  if (adminRole === "ADMIN" && !ADMIN_CREATABLE_INTERNAL_ROLES.includes(role)) {
    throw createHttpError("Un ADMIN ne peut créer que GESTIONNAIRE_DEPENSE ou EQUIPE_TRESORERIE", 403);
  }
}

// Duree de validite du lien d'invitation d'un compte interne.
const INVITE_TTL_HOURS = 168; // 7 jours

/**
 * Fabrique un jeton d'invitation et le renvoie EN CLAIR a l'appelant, qui doit
 * l'envoyer par email au titulaire. Seul son hash est conserve en base.
 */
async function issueInvitation(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      inviteTokenHash: hashInviteToken(token),
      inviteTokenExpiresAt: expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function createInternalUser({ adminId, adminRole, data, req }) {
  assertCanCreateInternalUser({ adminRole, role: data.role });

  // Mot de passe inutilisable : le titulaire fixera le sien via l'invitation.
  // Le createur du compte ne connait aucun secret permettant de s'y connecter.
  const passwordHash = await hashUnusablePassword();

  let created;
  try {
    created = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email.toLowerCase(),
        phone: data.phone,
        role: data.role,
        status: "PENDING_VERIFICATION",
        passwordHash,
        country: "N/A",
        city: "N/A",
      },
      select: userPublicSelect(),
    });
  } catch (err) {
    // Email et telephone sont @unique. Sans ce traitement, une simple faute de
    // frappe renvoie un 500 portant le texte brut de Prisma jusque dans
    // l'interface, nom de contrainte compris.
    if (err?.code === "P2002") {
      const champs = Array.isArray(err.meta?.target)
        ? err.meta.target.join(", ")
        : "email ou téléphone";
      throw createHttpError(`Un compte utilise déjà ce ${champs}.`, 409);
    }
    throw err;
  }

  await auditLog({
    userId: adminId,
    action: "USER_CREATED",
    entity: "User",
    entityId: created.id,
    req,
    meta: { role: created.role, status: created.status, invited: true },
  });

  // L'envoi de l'email ne doit pas faire echouer la creation : si Brevo tombe,
  // le compte existe et l'invitation se renvoie depuis l'interface.
  let invitationSent = true;
  try {
    const { token, expiresAt } = await issueInvitation(created.id);
    await sendInternalInviteMail({
      email: created.email,
      fullName: created.fullName,
      role: created.role,
      token,
      expiresAt,
    });
  } catch (err) {
    invitationSent = false;
    console.error("[invite] envoi impossible:", err?.message);
    await auditLog({
      userId: adminId,
      action: "USER_INVITE_SEND_FAILED",
      entity: "User",
      entityId: created.id,
      req,
      meta: { reason: err?.message },
    });
  }

  return { ...created, invitationSent };
}

export async function resendInternalUserInvitation({ adminId, adminRole, userId, req }) {
  await assertCanActOnTarget({
    adminId,
    adminRole,
    userId,
    action: "USER_INVITE_RESEND",
    req,
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, role: true, status: true },
  });

  if (user.status !== "PENDING_VERIFICATION") {
    throw createHttpError("Ce compte est déjà activé", 409);
  }

  const { token, expiresAt } = await issueInvitation(userId);
  await sendInternalInviteMail({
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    token,
    expiresAt,
  });

  await auditLog({
    userId: adminId,
    action: "USER_INVITE_RESENT",
    entity: "User",
    entityId: userId,
    req,
  });

  return { invitationSent: true, expiresAt };
}

/**
 * Garde commune a toutes les actions d'un ADMIN sur le compte d'autrui.
 *
 * Elle porte sur la CIBLE, jamais sur la valeur demandee : une garde posee
 * seulement sur la suspension laisserait un ADMIN REACTIVER un compte que le
 * SUPER_ADMIN vient de bloquer, ce qui revient au meme.
 */
async function assertCanActOnTarget({ adminId, adminRole, userId, action, req }) {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true },
  });

  if (!target) throw createHttpError("Utilisateur introuvable", 404);

  const isProtectedTarget =
    target.role === "ADMIN" ||
    target.role === "SUPER_ADMIN" ||
    target.id === adminId;

  if (adminRole === "ADMIN" && isProtectedTarget) {
    await auditLog({
      userId: adminId,
      action: `${action}_DENIED`,
      entity: "User",
      entityId: userId,
      req,
      meta: { targetRole: target.role, reason: "PROTECTED_TARGET" },
    });
    throw createHttpError(
      "Un ADMIN ne peut pas agir sur un ADMIN, un SUPER_ADMIN, ni sur son propre compte",
      403,
    );
  }

  return target;
}

export async function setUserStatus({ adminId, adminRole, userId, status, req }) {
  const target = await assertCanActOnTarget({
    adminId,
    adminRole,
    userId,
    action: "ADMIN_SET_USER_STATUS",
    req,
  });

  // Un compte encore en invitation n'a pas de mot de passe que son titulaire
  // connaisse. Le passer ACTIVE ou SUSPENDED casse l'unique chemin d'activation :
  // acceptInvitation exige PENDING_VERIFICATION, et le renvoi d'invitation aussi.
  // BLOCKED reste permis, c'est la facon d'annuler une invitation.
  // Le retour VERS PENDING_VERIFICATION reste permis : c'est le filet qui repare
  // un compte deja casse.
  if (target.status === "PENDING_VERIFICATION" && status !== "BLOCKED") {
    await auditLog({
      userId: adminId,
      action: "ADMIN_SET_USER_STATUS_DENIED",
      entity: "User",
      entityId: userId,
      req,
      meta: { from: target.status, to: status, reason: "INVITE_PENDING" },
    });
    throw createHttpError(
      "Ce compte n'a pas encore activé son invitation : renvoyez l'invitation, ou bloquez le compte.",
      409,
    );
  }

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

  // Sans cette invalidation, la revocation attendrait jusqu'a 30 secondes le
  // temps que le cache du middleware expire. La rendre immediate ne coute rien.
  invalidateUserCache(updated.id);

  await auditLog({
    userId: adminId,
    action: "ADMIN_SET_USER_STATUS",
    entity: "User",
    entityId: updated.id,
    req,
    meta: { from: target.status, to: status, targetRole: updated.role },
  });

  return updated;
}

function createHttpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function assertCanSetUserRole({ adminId, adminRole, userId, role, req }) {
  if (role === "SUPER_ADMIN") {
    await auditLog({
      userId: adminId,
      action: "ADMIN_SET_USER_ROLE_DENIED",
      entity: "User",
      entityId: userId,
      req,
      meta: { requestedRole: role, reason: "SUPER_ADMIN_BLOCKED" },
    });
    throw createHttpError("SUPER_ADMIN ne peut pas être attribué depuis l'interface", 403);
  }

  if (adminRole !== "SUPER_ADMIN") {
    await auditLog({
      userId: adminId,
      action: "ADMIN_SET_USER_ROLE_DENIED",
      entity: "User",
      entityId: userId,
      req,
      meta: { requestedRole: role, reason: "SUPER_ADMIN_REQUIRED" },
    });
    throw createHttpError("Seul le Super Admin peut modifier les roles utilisateurs", 403);
  }

  if (adminId === userId) {
    await auditLog({
      userId: adminId,
      action: "SUPER_ADMIN_SET_OWN_ROLE_DENIED",
      entity: "User",
      entityId: userId,
      req,
      meta: { requestedRole: role, reason: "SELF_ROLE_CHANGE_BLOCKED" },
    });
    throw createHttpError("Un Super Admin ne peut pas modifier son propre role", 400);
  }
}

export async function setUserRole({ adminId, adminRole, userId, role, req }) {
  await assertCanSetUserRole({ adminId, adminRole, userId, role, req });

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

  // Le role vient desormais de la base a chaque requete : une retrogradation
  // prend effet immediatement plutot qu'a l'expiration du jeton.
  invalidateUserCache(updated.id);

  await auditLog({
    userId: adminId,
    action: "SUPER_ADMIN_SET_USER_ROLE",
    entity: "User",
    entityId: updated.id,
    req,
    meta: { role },
  });

  return updated;
}

export async function resetUserOtpSecurity({ adminId, adminRole, userId, req }) {
  await assertCanActOnTarget({
    adminId,
    adminRole,
    userId,
    action: "ADMIN_RESET_OTP_SECURITY",
    req,
  });

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

/* =========================
   SUPERVISION (lecture seule)
   ========================= */

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Ce que l'ADMIN doit voir pour suivre le deroulement du travail de ses deux
 * profils. Uniquement des agregations et des listes : aucune ecriture, aucune
 * action possible depuis cet ecran.
 */
export async function getOversight() {
  const now = new Date();
  const since = new Date(now.getTime() - THIRTY_DAYS_MS);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    managers,
    treasurers,
    expensesByStatus,
    expensesByManager,
    ordersByTreasurer,
    ordersThisMonth,
    oldestPending,
    lastActivity,
    recentExpenses,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { role: "GESTIONNAIRE_DEPENSE" },
      select: { id: true, fullName: true, email: true, status: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "EQUIPE_TRESORERIE" },
      select: { id: true, fullName: true, email: true, status: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.expense.groupBy({
      by: ["status"],
      _count: { status: true },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["createdById", "status"],
      where: { createdAt: { gte: since } },
      _count: { status: true },
      _sum: { amount: true },
    }),
    prisma.paymentOrder.groupBy({
      by: ["createdById", "currency", "status"],
      where: { createdAt: { gte: since } },
      _count: { status: true },
      _sum: { amount: true },
    }),
    prisma.paymentOrder.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.expense.findFirst({
      where: { status: "EN_ATTENTE" },
      orderBy: { createdAt: "asc" },
      select: { id: true, createdAt: true, label: true, amount: true },
    }),
    prisma.auditLog.groupBy({
      by: ["userId"],
      _max: { createdAt: true },
    }),
    prisma.expense.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        createdAt: true,
        label: true,
        type: true,
        amount: true,
        status: true,
        beneficiaryName: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        paymentOrders: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            createdBy: { select: { id: true, fullName: true } },
          },
        },
      },
    }),
  ]);

  const parStatut = expensesByStatus.reduce((acc, r) => {
    acc[r.status] = { count: r._count.status, amount: r._sum.amount || 0 };
    return acc;
  }, {});

  const derniereActivite = new Map(
    lastActivity.filter((r) => r.userId).map((r) => [r.userId, r._max.createdAt]),
  );

  const profilDepensier = (u) => {
    const lignes = expensesByManager.filter((r) => r.createdById === u.id);
    const compte = (statut) =>
      lignes.filter((r) => r.status === statut).reduce((n, r) => n + r._count.status, 0);
    return {
      ...u,
      lastActivityAt: derniereActivite.get(u.id) || null,
      created30d: lignes.reduce((n, r) => n + r._count.status, 0),
      engagedAmount30d: lignes.reduce((n, r) => n + (r._sum.amount || 0), 0),
      pending: compte("EN_ATTENTE"),
      rejected: compte("REJETER"),
    };
  };

  const profilTresorier = (u) => {
    const lignes = ordersByTreasurer.filter((r) => r.createdById === u.id);
    // Les montants sont regroupes PAR DEVISE : additionner des francs
    // djiboutiens, des birrs et des dollars produirait un nombre qui n'existe
    // pas — et c'est un nombre sur lequel on deciderait d'un decaissement.
    const parDevise = {};
    for (const r of lignes) {
      parDevise[r.currency] = (parDevise[r.currency] || 0) + (r._sum.amount || 0);
    }
    return {
      ...u,
      lastActivityAt: derniereActivite.get(u.id) || null,
      orders30d: lignes.reduce((n, r) => n + r._count.status, 0),
      amountByCurrency30d: parDevise,
      notPrinted: lignes
        .filter((r) => r.status === "CREE")
        .reduce((n, r) => n + r._count.status, 0),
    };
  };

  return {
    indicators: {
      pending: parStatut.EN_ATTENTE || { count: 0, amount: 0 },
      approvedNotDisbursed: parStatut.APPROUVER || { count: 0, amount: 0 },
      disbursed: parStatut.EFFECTUER || { count: 0, amount: 0 },
      ordersThisMonth,
      // Le chiffre qui compte pour un superviseur n'est pas le volume, c'est le
      // dossier qui attend depuis le plus longtemps.
      oldestPending: oldestPending
        ? {
            ...oldestPending,
            ageDays: Math.floor(
              (now.getTime() - oldestPending.createdAt.getTime()) / 86_400_000,
            ),
          }
        : null,
    },
    managers: managers.map(profilDepensier),
    treasurers: treasurers.map(profilTresorier),
    recentExpenses,
  };
}
