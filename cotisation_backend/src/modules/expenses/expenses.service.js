import crypto from "crypto";
import prisma from "../../config/prisma.js";
import { auditLog } from "../../utils/audit.js";
import { sendExpenseApprovalTokenEmail } from "../../services/mail.service.js";

const TOKEN_TTL_HOURS = 48;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function publicExpenseSelect() {
  return {
    id: true,
    createdAt: true,
    updatedAt: true,
    date: true,
    type: true,
    label: true,
    quantity: true,
    unitPrice: true,
    amount: true,
    beneficiaryName: true,
    beneficiaryCountry: true,
    beneficiaryCity: true,
    status: true,
    createdById: true,
    approvedByManagerAt: true,
    superAdminNotifiedAt: true,
    createdBy: { select: { id: true, fullName: true, companyName: true, email: true } },
    paymentOrders: { select: { id: true, referenceNumber: true, status: true } },
  };
}

/**
 * Le perimetre de lecture d'un role sur les depenses.
 *
 * Une seule fonction, utilisee par la liste ET par le tableau de bord : les deux
 * derivaient leur filtre separement, chacune avec un `else {}` muet qui rendait
 * TOUT visible a n'importe quel role non prevu. Le tresorier obtenait ainsi, via
 * le tableau de bord, les agregats de depenses qu'il n'est pas cense voir.
 * Chaque branche est desormais une decision explicite, et un role inconnu est
 * refuse au lieu de tout voir.
 */
export function expenseScopeFor(user) {
  if (user.role === "GESTIONNAIRE_DEPENSE") return { createdById: user.id };
  if (user.role === "EQUIPE_TRESORERIE") return { status: "APPROUVER" };
  // Supervision : tout, par decision. ADMIN en lecture seule, jamais en ecriture.
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return {};

  const err = new Error("Accès refusé");
  err.status = 403;
  throw err;
}

export async function getExpenseDashboard({ user }) {
  const expenseWhere = expenseScopeFor(user);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthWhere = { ...expenseWhere, createdAt: { gte: monthStart } };

  const [total, monthTotal, byStatus, latestExpenses] = await Promise.all([
    prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true }, _count: true }),
    prisma.expense.aggregate({ where: monthWhere, _sum: { amount: true }, _count: true }),
    prisma.expense.groupBy({
      by: ["status"],
      where: expenseWhere,
      _count: { status: true },
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      where: expenseWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: publicExpenseSelect(),
    }),
  ]);

  const statusCounts = byStatus.reduce((acc, row) => {
    acc[row.status] = { count: row._count.status, amount: row._sum.amount || 0 };
    return acc;
  }, {});

  return {
    totalExpenses: total._sum.amount || 0,
    totalExpensesCount: total._count,
    approvedExpenses: statusCounts.APPROUVER?.count || 0,
    rejectedExpenses: statusCounts.REJETER?.count || 0,
    pendingExpenses: statusCounts.EN_ATTENTE?.count || 0,
    completedExpenses: statusCounts.EFFECTUER?.count || 0,
    monthExpensesCount: monthTotal._count,
    monthExpensesAmount: monthTotal._sum.amount || 0,
    expensesByStatus: byStatus.map((row) => ({
      status: row.status,
      count: row._count.status,
      amount: row._sum.amount || 0,
    })),
    latestExpenses,
  };
}

export async function createExpense({ user, data, req }) {
  const amount = data.amount || data.quantity * data.unitPrice;
  const expense = await prisma.expense.create({
    data: {
      date: data.date || new Date(),
      type: data.type,
      label: data.label,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      amount,
      beneficiaryName: data.beneficiaryName,
      beneficiaryCountry: data.beneficiaryCountry,
      beneficiaryCity: data.beneficiaryCity,
      status: "EN_ATTENTE",
      createdById: user.id,
    },
    select: publicExpenseSelect(),
  });

  await auditLog({ userId: user.id, action: "EXPENSE_CREATE", entity: "Expense", entityId: expense.id, req, meta: { amount, type: expense.type } });
  return expense;
}

export async function listExpenses({ user }) {
  return prisma.expense.findMany({
    where: expenseScopeFor(user),
    orderBy: { createdAt: "desc" },
    take: 200,
    select: publicExpenseSelect(),
  });
}

/**
 * La chronologie complete d'un dossier de depense : qui l'a engagee, qui l'a
 * approuvee, qui l'a decaissee, et quand. C'est l'information qui manquait pour
 * qu'un ADMIN puisse reellement suivre le deroulement du travail de ses deux
 * profils, plutot que de regarder une liste de montants.
 */
export async function getExpenseTrail({ id }) {
  const expense = await prisma.expense.findUnique({
    where: { id },
    select: publicExpenseSelect(),
  });

  if (!expense) {
    const err = new Error("Dépense introuvable");
    err.status = 404;
    throw err;
  }

  const orders = await prisma.paymentOrder.findMany({
    where: { expenseId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      referenceNumber: true,
      status: true,
      amount: true,
      currency: true,
      createdAt: true,
      createdBy: { select: { id: true, fullName: true, email: true, role: true } },
    },
  });

  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entity: "Expense", entityId: id },
        { entity: "PaymentOrder", entityId: { in: orders.map((o) => o.id) } },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: {
      action: true,
      createdAt: true,
      meta: true,
      ip: true,
      user: { select: { id: true, fullName: true, email: true, role: true } },
    },
  });

  return { expense, orders, logs };
}

function assertSuperAdminRole(role) {
  if (role !== "SUPER_ADMIN") {
    const err = new Error("Action réservée au Super Admin");
    err.status = 403;
    throw err;
  }
}

function ensureActionableExpense(expense) {
  if (!expense) {
    const err = new Error("Dépense introuvable");
    err.status = 404;
    throw err;
  }
  if (expense.status === "EFFECTUER") {
    const err = new Error("Cette dépense est déjà effectuée");
    err.status = 409;
    throw err;
  }
}

export async function approveExpense({ userId: currentUserId, role, id, req }) {
  assertSuperAdminRole(role);

  const existing = await prisma.expense.findUnique({ where: { id } });
  ensureActionableExpense(existing);

  const superAdmin = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { id: true, email: true, role: true, fullName: true },
  });

  const superAdminEmail = superAdmin?.email?.trim();
  if (!superAdmin || superAdmin.role !== "SUPER_ADMIN" || !superAdminEmail || !superAdminEmail.includes("@")) {
    const err = new Error("Votre compte Super Admin n’a pas d’email valide. Veuillez mettre à jour votre email.");
    err.status = 409;
    throw err;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      status: "APPROUVER",
      approvedByManagerAt: new Date(),
      approvalTokenHash: tokenHash,
      approvalTokenExpiresAt: expiresAt,
      superAdminNotifiedAt: new Date(),
    },
    select: publicExpenseSelect(),
  });

  await sendExpenseApprovalTokenEmail({ to: superAdminEmail, expense, token });

  await auditLog({
    userId: currentUserId,
    action: "EXPENSE_APPROVED",
    entity: "Expense",
    entityId: id,
    req,
    meta: { expiresAt, notifiedSuperAdminEmail: superAdminEmail },
  });

  return { message: "Dépense approuvée. Le token a été envoyé au Super Admin connecté." };
}

export async function rejectExpense({ user, id, req }) {
  assertSuperAdminRole(user.role);

  const existing = await prisma.expense.findUnique({ where: { id } });
  ensureActionableExpense(existing);

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      status: "REJETER",
      approvalTokenHash: null,
      approvalTokenExpiresAt: null,
      superAdminNotifiedAt: null,
    },
    select: publicExpenseSelect(),
  });

  await auditLog({ userId: user.id, action: "EXPENSE_REJECTED", entity: "Expense", entityId: id, req });

  return { message: "Dépense rejetée", expense };
}

export { hashToken };
