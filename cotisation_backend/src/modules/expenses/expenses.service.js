import crypto from "crypto";
import prisma from "../../config/prisma.js";
import { auditLog } from "../../utils/audit.js";
import { sendExpenseApprovalTokenEmail } from "../../services/mail.service.js";

const TOKEN_TTL_HOURS = 48;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function publicExpenseInclude() {
  return {
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
    include: publicExpenseInclude(),
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
    include: publicExpenseInclude(),
  });
}

export async function approveExpense({ user, id, req }) {
  const existing = await prisma.expense.findFirst({ where: { id, createdById: user.id } });
  if (!existing) {
    const err = new Error("Dépense introuvable");
    err.status = 404;
    throw err;
  }
  if (existing.status === "EFFECTUER") {
    const err = new Error("Cette dépense est déjà effectuée");
    err.status = 409;
    throw err;
  }

  const superAdmins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN", email: { not: null } },
    select: { email: true },
  });
  if (!superAdmins.length) {
    const err = new Error("Aucun SUPER_ADMIN avec email n'est configuré");
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
    include: publicExpenseInclude(),
  });

  await Promise.all(
    superAdmins.map((admin) => sendExpenseApprovalTokenEmail({ to: admin.email, expense, token })),
  );

  await auditLog({ userId: user.id, action: "EXPENSE_APPROVE", entity: "Expense", entityId: id, req, meta: { expiresAt, notifiedSuperAdmins: superAdmins.length } });
  return { message: "Demande envoyée au Super Admin avec token par email" };
}

export { hashToken };
