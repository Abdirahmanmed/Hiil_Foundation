import prisma from "../../config/prisma.js";
import { auditLog } from "../../utils/audit.js";
import { verifyPassword } from "../../utils/hash.js";
import { sendExpenseApprovedEmail } from "../../services/mail.service.js";

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
    currency: true,
    beneficiaryName: true,
    beneficiaryCountry: true,
    beneficiaryCity: true,
    beneficiaryBankName: true,
    beneficiaryAccountRef: true,
    beneficiaryAccountHolder: true,
    status: true,
    createdById: true,
    approvedByManagerAt: true,
    rejectedAt: true,
    rejectionReason: true,
    superAdminNotifiedAt: true,
    createdBy: { select: { id: true, fullName: true, companyName: true, email: true } },
    approvedBy: { select: { id: true, fullName: true, email: true } },
    rejectedBy: { select: { id: true, fullName: true, email: true } },
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
  if (user.role === "ADMIN" || user.role === "OUGAS_ADMIN") return {};

  const err = new Error("Accès refusé");
  err.status = 403;
  throw err;
}

export async function getExpenseDashboard({ user }) {
  const expenseWhere = expenseScopeFor(user);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthWhere = { ...expenseWhere, createdAt: { gte: monthStart } };

  const [total, monthTotal, byStatus, byCurrency, latestExpenses] = await Promise.all([
    prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true }, _count: true }),
    prisma.expense.aggregate({ where: monthWhere, _sum: { amount: true }, _count: true }),
    prisma.expense.groupBy({
      by: ["status"],
      where: expenseWhere,
      _count: { status: true },
      _sum: { amount: true },
    }),
    // Additionner francs djiboutiens, birrs et dollars donne un chiffre qui
    // n'existe pas — et c'est celui que le Super Admin regarde pour décider
    // d'un décaissement. Les totaux scalaires ci-dessus restent pour ne rien
    // casser côté front, mais c'est CETTE ventilation qui dit la vérité.
    prisma.expense.groupBy({
      by: ["currency"],
      where: expenseWhere,
      _count: { currency: true },
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
    expensesByCurrency: byCurrency.map((row) => ({
      currency: row.currency,
      count: row._count.currency,
      amount: row._sum.amount || 0,
    })),
    latestExpenses,
  };
}

export async function createExpense({ user, data, req }) {
  // Le montant est DERIVE, jamais saisi.
  //
  // Avant : `data.amount || data.quantity * data.unitPrice`. Le client fixait
  // donc librement le montant, et le champ etait editable dans le formulaire.
  // Un depensier pouvait declarer 10 sacs de riz a 1 000 DJF et faire approuver
  // 500 000 : le Super Admin validait un chiffre incoherent avec le detail
  // qu'il lisait juste au-dessus, et la contrainte d'unicite garantissait que
  // ce chiffre-la sortirait de la caisse. C'etait en amont de tous les
  // controles construits ici.
  const amount = data.quantity * data.unitPrice;

  // `amount` reste accepte par le schema, mais uniquement comme controle de
  // coherence : un ecart revele un bug du formulaire au lieu de le masquer.
  if (data.amount !== undefined && data.amount !== amount) {
    const err = new Error(
      `Le montant doit valoir quantité × prix unitaire (${data.quantity} × ${data.unitPrice} = ${amount}).`,
    );
    err.status = 400;
    throw err;
  }
  const expense = await prisma.expense.create({
    data: {
      date: data.date || new Date(),
      type: data.type,
      label: data.label,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      amount,
      currency: data.currency || "FRANC",
      beneficiaryName: data.beneficiaryName,
      beneficiaryCountry: data.beneficiaryCountry,
      beneficiaryCity: data.beneficiaryCity,
      beneficiaryBankName: data.beneficiaryBankName || null,
      beneficiaryAccountRef: data.beneficiaryAccountRef || null,
      beneficiaryAccountHolder: data.beneficiaryAccountHolder || null,
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

/**
 * Machine a etats d'une depense. Les seules transitions legales :
 *
 *   (creation)  -> EN_ATTENTE   GESTIONNAIRE_DEPENSE
 *   EN_ATTENTE  -> APPROUVER    OUGAS_ADMIN
 *   EN_ATTENTE  -> REJETER      OUGAS_ADMIN
 *   APPROUVER   -> REJETER      OUGAS_ADMIN, tant qu'aucun ordre n'existe
 *   APPROUVER   -> EFFECTUER    EQUIPE_TRESORERIE, via la creation d'un ordre
 *   EFFECTUER   -> APPROUVER    EQUIPE_TRESORERIE, via l'annulation d'un ordre
 *   REJETER     -> (rien)       terminal : on recree une depense
 *
 * Avant, seul EFFECTUER etait bloque. Re-approuver une depense deja APPROUVER
 * regenerait un jeton et tuait silencieusement celui deja transmis a la
 * tresorerie, et une depense REJETER pouvait etre ressuscitee. Ce sont des
 * sorties d'argent.
 *
 * Le garde seul ne suffirait pas : entre un findUnique et un update il y a une
 * fenetre. Toute ecriture de statut passe donc par un updateMany conditionne sur
 * l'etat SOURCE — c'est Postgres qui arbitre, pas le code.
 */
async function transition({ tx, id, from, to, data, message }) {
  const { count } = await tx.expense.updateMany({
    where: { id, status: { in: Array.isArray(from) ? from : [from] } },
    data: { status: to, ...data },
  });

  if (count === 0) {
    const existe = await tx.expense.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existe) {
      const err = new Error("Dépense introuvable");
      err.status = 404;
      throw err;
    }
    const err = new Error(message);
    err.status = 409;
    throw err;
  }
}

/**
 * Re-authentification de l'approbateur.
 *
 * C'est le vrai second facteur, la ou l'ancien jeton n'en etait pas un : un JWT
 * vole ou un poste laisse ouvert ne suffit plus a faire sortir de l'argent.
 */
async function assertApproverPassword({ userId, password, req, expenseId }) {
  const approbateur = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true, passwordHash: true },
  });

  if (!approbateur || approbateur.role !== "OUGAS_ADMIN" || approbateur.status !== "ACTIVE") {
    const err = new Error("Action réservée à l'Ougas Admin");
    err.status = 403;
    throw err;
  }

  if (!(await verifyPassword(approbateur.passwordHash, password))) {
    await auditLog({
      userId,
      action: "EXPENSE_APPROVAL_REAUTH_FAILED",
      entity: "Expense",
      entityId: expenseId,
      req,
    });
    const err = new Error("Mot de passe incorrect");
    err.status = 401;
    throw err;
  }
}

export async function approveExpense({ userId: currentUserId, id, password, req }) {
  await assertApproverPassword({ userId: currentUserId, password, req, expenseId: id });

  // Le changement de statut et sa ligne d'audit dans la MEME transaction : une
  // sortie d'argent ne doit jamais pouvoir exister sans sa trace. Aucun appel
  // reseau ici — l'email part apres, et son echec n'annule rien.
  await prisma.$transaction(async (tx) => {
    await transition({
      tx,
      id,
      from: "EN_ATTENTE",
      to: "APPROUVER",
      data: {
        approvedById: currentUserId,
        approvedByManagerAt: new Date(),
      },
      message: "Cette dépense n'est plus en attente d'approbation",
    });

    await tx.auditLog.create({
      data: {
        userId: currentUserId,
        action: "EXPENSE_APPROVED",
        entity: "Expense",
        entityId: id,
        ip: req?.ip || null,
        userAgent: req?.get?.("user-agent")?.slice(0, 500) || null,
      },
    });
  });

  // La liste des depenses APPROUVER EST deja le canal de notification de la
  // tresorerie : listExpenses filtre exactement la-dessus pour son role. L'email
  // n'est qu'un confort, la depense reste decaissable sans lui.
  notifyTreasury(id).catch((err) =>
    console.error("[expenses] notification trésorerie impossible:", err?.message),
  );

  return { message: "Dépense approuvée. Elle apparaît dans la liste de la trésorerie." };
}

async function notifyTreasury(expenseId) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: publicExpenseSelect(),
  });
  if (!expense) return;

  const destinataires = await prisma.user.findMany({
    where: { role: "EQUIPE_TRESORERIE", status: "ACTIVE" },
    select: { email: true },
  });
  if (!destinataires.length) return;

  await sendExpenseApprovedEmail({
    to: destinataires.map((u) => u.email),
    expense,
  });

  await prisma.expense.update({
    where: { id: expenseId },
    data: { superAdminNotifiedAt: new Date() },
  });
}

export async function rejectExpense({ user, id, reason, req }) {
  await prisma.$transaction(async (tx) => {
    // Une depense APPROUVER reste revocable tant qu'aucun ordre n'a ete emis :
    // passe ce point, c'est une annulation d'ordre qu'il faut, pas un rejet.
    // Seuls les ordres ACTIFS bloquent. En comptant aussi les annulés, une
    // dépense dont l'ordre avait été annulé ne pouvait plus JAMAIS être
    // rejetée : l'approbateur perdait son veto pour toujours, alors que la
    // trésorerie, elle, gardait la main pour réémettre.
    const ordres = await tx.paymentOrder.count({
      where: { expenseId: id, status: { not: "ANNULE" } },
    });
    if (ordres > 0) {
      const err = new Error(
        "Un ordre de paiement a déjà été émis : annulez-le avant de rejeter la dépense.",
      );
      err.status = 409;
      throw err;
    }

    await transition({
      tx,
      id,
      from: ["EN_ATTENTE", "APPROUVER"],
      to: "REJETER",
      data: {
        rejectedById: user.id,
        rejectedAt: new Date(),
        rejectionReason: reason,
        superAdminNotifiedAt: null,
      },
      message: "Cette dépense ne peut plus être rejetée dans son état actuel",
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "EXPENSE_REJECTED",
        entity: "Expense",
        entityId: id,
        meta: { reason },
        ip: req?.ip || null,
        userAgent: req?.get?.("user-agent")?.slice(0, 500) || null,
      },
    });
  });

  const expense = await prisma.expense.findUnique({
    where: { id },
    select: publicExpenseSelect(),
  });

  return { message: "Dépense rejetée", expense };
}
