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

export async function getExpenseDashboard({ user }) {
  const isManager = user.role === "GESTIONNAIRE_DEPENSE";
  const expenseWhere = isManager ? { createdById: user.id } : {};

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [associationsCount, adherentsCount, monthlyCotisation, annualCotisation, totalExpenses, byStatus] =
    await Promise.all([
      prisma.user.count({ where: { accountType: "ASSOCIATION" } }),
      prisma.user.count({ where: { accountType: "CLIENT_ADHERENT" } }),
      prisma.subscription.aggregate({
        where: { createdAt: { gte: monthStart }, status: { in: ["ACTIVE", "ACTIVE_MANUAL"] } },
        _sum: { amount: true },
      }),
      prisma.subscription.aggregate({
        where: { createdAt: { gte: yearStart }, status: { in: ["ACTIVE", "ACTIVE_MANUAL"] } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true }, _count: true }),
      prisma.expense.groupBy({ by: ["status"], where: expenseWhere, _count: { status: true }, _sum: { amount: true } }),
    ]);

  return {
    associationsCount,
    adherentsCount,
    monthlyCotisation: monthlyCotisation._sum.amount || 0,
    annualCotisation: annualCotisation._sum.amount || 0,
    totalExpenses: totalExpenses._sum.amount || 0,
    totalExpensesCount: totalExpenses._count,
    expensesByStatus: byStatus.map((row) => ({
      status: row.status,
      count: row._count.status,
      amount: row._sum.amount || 0,
    })),
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
  const where =
    user.role === "GESTIONNAIRE_DEPENSE"
      ? { createdById: user.id }
      : user.role === "EQUIPE_TRESORERIE"
        ? { status: "APPROUVER" }
        : {};

  return prisma.expense.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: publicExpenseSelect(),
  });
}

function assertSuperAdmin(user) {
  if (user.role !== "SUPER_ADMIN") {
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

export async function approveExpense({ user, id, req }) {
  assertSuperAdmin(user);

  const existing = await prisma.expense.findUnique({ where: { id } });
  ensureActionableExpense(existing);

  if (!user.email) {
    const err = new Error("Le Super Admin connecté n’a pas d’email valide.");
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

  await sendExpenseApprovalTokenEmail({ to: user.email, expense, token });

  await auditLog({
    userId: user.id,
    action: "EXPENSE_APPROVED",
    entity: "Expense",
    entityId: id,
    req,
    meta: { expiresAt, notifiedSuperAdminEmail: user.email },
  });

  return { message: "Dépense approuvée. Le token a été envoyé au Super Admin connecté." };
}

export async function rejectExpense({ user, id, req }) {
  assertSuperAdmin(user);

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
