import crypto from "crypto";
import prisma from "../../config/prisma.js";
import { auditLog } from "../../utils/audit.js";

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
  const order = await prisma.$transaction(async (tx) => {
    // Verrou de ligne : deux requetes simultanees — double-clic, retry axios,
    // deux tresoriers — lisaient toutes deux APPROUVER et produisaient deux
    // ordres, chacun imprimable et remis a la banque. Postgres les serialise.
    const verrou = await tx.$queryRaw`
      SELECT "id" FROM "Expense" WHERE "id" = ${data.expenseId} FOR UPDATE`;
    if (!verrou.length) {
      const err = new Error("Dépense introuvable");
      err.status = 404;
      throw err;
    }

    const expense = await tx.expense.findUnique({ where: { id: data.expenseId } });
    if (expense.status !== "APPROUVER") {
      const err = new Error("La dépense doit être approuvée avant paiement");
      err.status = 409;
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
        paymentMethod: data.paymentMethod,
        currency: data.currency,
        paymentCountry: data.paymentCountry,
        amount,
        // Le pays de banque saisi n'est plus ecrase par le pays de paiement :
        // un virement depuis Djibouti vers un compte en Ethiopie etait
        // enregistre bankCountry = DJIBOUTI.
        bankCountry:
          data.paymentMethod === "CASH"
            ? null
            : (data.bankCountry ?? data.paymentCountry),
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

    // L'audit DANS la transaction : un decaissement ne doit jamais pouvoir
    // exister sans sa trace. Il etait ecrit apres, donc perdu si le process
    // tombait entre les deux.
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "PAYMENT_ORDER_CREATE",
        entity: "PaymentOrder",
        entityId: created.id,
        meta: {
          expenseId: data.expenseId,
          referenceNumber: created.referenceNumber,
          amount: created.amount,
        },
        ip: req?.ip || null,
        userAgent: req?.get?.("user-agent")?.slice(0, 500) || null,
      },
    });

    return created;
  });

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
