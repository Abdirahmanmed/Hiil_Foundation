import crypto from "crypto";
import prisma from "../../config/prisma.js";
import { auditLog } from "../../utils/audit.js";

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function includeOrder() {
  return {
    expense: {
      select: {
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
        createdBy: { select: { id: true, fullName: true, companyName: true, email: true } },
      },
    },
    createdBy: { select: { id: true, fullName: true, email: true } },
  };
}

async function generateReference(tx) {
  for (let i = 0; i < 5; i += 1) {
    const ref = `OP-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const exists = await tx.paymentOrder.findUnique({ where: { referenceNumber: ref } });
    if (!exists) return ref;
  }
  return `OP-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function createPaymentOrder({ user, data, req }) {
  const tokenHash = hashToken(data.token);

  const order = await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.findUnique({ where: { id: data.expenseId } });
    if (!expense) {
      const err = new Error("Dépense introuvable");
      err.status = 404;
      throw err;
    }
    if (expense.status !== "APPROUVER") {
      const err = new Error("La dépense doit être approuvée avant paiement");
      err.status = 409;
      throw err;
    }
    if (!expense.approvalTokenHash || expense.approvalTokenHash !== tokenHash) {
      const err = new Error("Token invalide");
      err.status = 403;
      throw err;
    }
    if (!expense.approvalTokenExpiresAt || expense.approvalTokenExpiresAt < new Date()) {
      const err = new Error("Token expiré");
      err.status = 403;
      throw err;
    }

    if (data.amount !== expense.amount) {
      const err = new Error("Le montant de l'ordre de paiement doit correspondre au montant de la depense approuvee");
      err.status = 400;
      throw err;
    }

    const amount = expense.amount;
    const referenceNumber = await generateReference(tx);
    const created = await tx.paymentOrder.create({
      data: {
        expenseId: expense.id,
        createdById: user.id,
        tokenUsedHash: tokenHash,
        paymentMethod: data.paymentMethod,
        currency: data.currency,
        paymentCountry: data.paymentCountry,
        amount,
        bankCountry: data.paymentMethod === "CASH" ? null : data.paymentCountry,
        bankName: data.paymentMethod === "CASH" ? null : data.bankName,
        bankReference: data.paymentMethod === "CASH" ? null : data.bankReference,
        bankAccountHolder: data.paymentMethod === "CASH" ? null : data.bankAccountHolder,
        referenceNumber,
        status: "CREE",
      },
      include: includeOrder(),
    });

    await tx.expense.update({
      where: { id: expense.id },
      data: { status: "EFFECTUER" },
    });

    return created;
  });

  await auditLog({ userId: user.id, action: "PAYMENT_ORDER_CREATE", entity: "PaymentOrder", entityId: order.id, req, meta: { expenseId: data.expenseId, referenceNumber: order.referenceNumber, amount: order.amount } });
  return order;
}

export async function listPaymentOrders() {
  return prisma.paymentOrder.findMany({ orderBy: { createdAt: "desc" }, include: includeOrder() });
}

export async function getPaymentOrderPrint({ user, id, req }) {
  const order = await prisma.paymentOrder.findUnique({ where: { id }, include: includeOrder() });
  if (!order) {
    const err = new Error("Ordre de paiement introuvable");
    err.status = 404;
    throw err;
  }

  await auditLog({ userId: user.id, action: "PAYMENT_ORDER_PRINT_VIEW", entity: "PaymentOrder", entityId: id, req, meta: { referenceNumber: order.referenceNumber } });
  return order;
}

export async function markPaymentOrderPrinted({ user, id, req }) {
  const order = await prisma.paymentOrder.findUnique({ where: { id }, include: includeOrder() });
  if (!order) {
    const err = new Error("Ordre de paiement introuvable");
    err.status = 404;
    throw err;
  }

  const updated =
    order.status === "IMPRIME"
      ? order
      : await prisma.paymentOrder.update({
          where: { id },
          data: { status: "IMPRIME" },
          include: includeOrder(),
        });

  await auditLog({ userId: user.id, action: "PAYMENT_ORDER_PRINT_MARKED", entity: "PaymentOrder", entityId: id, req, meta: { referenceNumber: updated.referenceNumber } });
  return updated;
}
