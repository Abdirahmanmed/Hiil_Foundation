import prisma from "../../config/prisma.js";

function expensePublicSelect() {
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

function paymentOrderPublicSelect() {
  return {
    id: true,
    createdAt: true,
    updatedAt: true,
    referenceNumber: true,
    paymentMethod: true,
    currency: true,
    paymentCountry: true,
    amount: true,
    bankCountry: true,
    bankName: true,
    bankReference: true,
    bankAccountHolder: true,
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
    createdBy: { select: { id: true, fullName: true, email: true } },
  };
}

export async function getTreasuryDashboard() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalExpenses,
    monthExpenses,
    expensesByStatus,
    latestApprovedExpenses,
    totalPaymentOrders,
    monthPaymentOrders,
    paymentOrdersByStatus,
    latestPaymentOrders,
  ] = await Promise.all([
    prisma.expense.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.expense.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { amount: true }, _count: true }),
    prisma.expense.groupBy({ by: ["status"], _count: { status: true }, _sum: { amount: true } }),
    prisma.expense.findMany({ where: { status: "APPROUVER" }, orderBy: { createdAt: "desc" }, take: 5, select: expensePublicSelect() }),
    // « Engagé » exclut les ordres annulés : un ordre annulé n'engage plus rien.
    prisma.paymentOrder.aggregate({ where: { status: { not: "ANNULE" } }, _sum: { amount: true }, _count: true }),
    prisma.paymentOrder.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { amount: true }, _count: true }),
    prisma.paymentOrder.groupBy({ by: ["status"], _count: { status: true }, _sum: { amount: true } }),
    prisma.paymentOrder.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: paymentOrderPublicSelect() }),
  ]);

  const expenseStatusCounts = expensesByStatus.reduce((acc, row) => {
    acc[row.status] = { count: row._count.status, amount: row._sum.amount || 0 };
    return acc;
  }, {});
  const orderStatusCounts = paymentOrdersByStatus.reduce((acc, row) => {
    acc[row.status] = { count: row._count.status, amount: row._sum.amount || 0 };
    return acc;
  }, {});

  return {
    totalExpenses: totalExpenses._sum.amount || 0,
    totalExpensesCount: totalExpenses._count,
    approvedExpenses: expenseStatusCounts.APPROUVER?.count || 0,
    rejectedExpenses: expenseStatusCounts.REJETER?.count || 0,
    pendingExpenses: expenseStatusCounts.EN_ATTENTE?.count || 0,
    completedExpenses: expenseStatusCounts.EFFECTUER?.count || 0,
    monthExpensesCount: monthExpenses._count,
    monthExpensesAmount: monthExpenses._sum.amount || 0,
    expensesByStatus: expensesByStatus.map((row) => ({ status: row.status, count: row._count.status, amount: row._sum.amount || 0 })),
    totalPaymentOrders: totalPaymentOrders._count,
    monthPaymentOrders: monthPaymentOrders._count,
    totalPaymentOrdersAmount: totalPaymentOrders._sum.amount || 0,
    monthPaymentOrdersAmount: monthPaymentOrders._sum.amount || 0,
    createdPaymentOrders: orderStatusCounts.CREE?.count || 0,
    printedPaymentOrders: orderStatusCounts.IMPRIME?.count || 0,
    // « Engagé » et « réellement payé » sont deux chiffres différents, et les
    // confondre était un mensonge de fond : une dépense basculait en EFFECTUER
    // à la seconde où le bon était créé, alors que le virement part des jours
    // plus tard — et parfois jamais.
    executedPaymentOrders: orderStatusCounts.EXECUTE?.count || 0,
    cancelledPaymentOrders: orderStatusCounts.ANNULE?.count || 0,
    engagedAmount:
      (totalPaymentOrders._sum.amount || 0),
    paidAmount: orderStatusCounts.EXECUTE?.amount || 0,
    paymentOrdersByStatus: paymentOrdersByStatus.map((row) => ({ status: row.status, count: row._count.status, amount: row._sum.amount || 0 })),
    latestApprovedExpenses,
    latestPaymentOrders,
  };
}
