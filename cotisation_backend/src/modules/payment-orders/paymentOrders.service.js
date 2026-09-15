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

    // La devise de l'ordre DECOULE de la depense : comparer un montant sans
    // comparer sa monnaie revient a comparer des unites differentes.
    if (data.currency !== expense.currency) {
      const err = new Error(
        `La devise de l'ordre doit être celle de la dépense approuvée (${expense.currency}).`,
      );
      err.status = 400;
      throw err;
    }

    if (data.amount !== expense.amount) {
      const err = new Error("Le montant de l'ordre de paiement doit correspondre au montant de la depense approuvee");
      err.status = 400;
      throw err;
    }

    const amount = expense.amount;
    const referenceNumber = await generateReference(tx);

    // Les coordonnees bancaires viennent de la DEPENSE, c'est-a-dire de ce que
    // le Super Admin a reellement approuve. Le tresorier recopie, il ne decide
    // pas vers quel compte l'argent part.
    //
    // Repli transitoire : les depenses creees avant ce changement n'ont pas ces
    // champs. On accepte alors la saisie du tresorier, mais on l'ecrit dans
    // l'audit — pour qu'un decaissement dont le compte n'a jamais ete approuve
    // reste identifiable.
    const especes = data.paymentMethod === "CASH";

    // ET, pas OU : un compte n'est « specifie » que s'il est COMPLET. Avec un
    // OU, une depense portant un numero sans nom de banque faisait diverger la
    // condition du serveur de celle de l'ecran — le tresorier saisissait une
    // banque que le serveur jetait ensuite, et le bon sortait sans coordonnees.
    const depenseSpecifieCompte = Boolean(
      expense.beneficiaryBankName && expense.beneficiaryAccountRef,
    );

    // Basculer en especes effacerait le compte que le Super Admin a approuve,
    // et le tresorier deciderait seul a qui remettre l'argent en main propre.
    // C'est exactement le contournement que le compte approuve vient fermer.
    if (especes && depenseSpecifieCompte) {
      const err = new Error(
        "Cette dépense a été approuvée avec un compte bancaire : elle ne peut pas être décaissée en espèces.",
      );
      err.status = 409;
      throw err;
    }
    const compte = especes
      ? { bankName: null, bankReference: null, bankAccountHolder: null }
      : depenseSpecifieCompte
        ? {
            bankName: expense.beneficiaryBankName,
            bankReference: expense.beneficiaryAccountRef,
            bankAccountHolder:
              expense.beneficiaryAccountHolder || expense.beneficiaryName,
          }
        : {
            bankName: data.bankName,
            bankReference: data.bankReference,
            bankAccountHolder: data.bankAccountHolder,
          };

    // La regle « il faut des coordonnees bancaires » vit ici et non dans zod,
    // parce qu'elle depend de la depense : selon que celle-ci porte deja un
    // compte approuve ou non, ce sont deux sources differentes qu'il faut
    // verifier. Le message distingue les deux cas, sinon le tresorier cherche
    // dans un formulaire ou il n'y a rien a corriger.
    if (!especes && (!compte.bankName || !compte.bankReference)) {
      const err = new Error(
        depenseSpecifieCompte
          ? "Le compte approuvé avec cette dépense est incomplet (banque et numéro de compte requis). Corrigez la dépense avant d'émettre l'ordre."
          : "Banque et numéro de compte sont requis pour ce mode de paiement.",
      );
      err.status = 400;
      throw err;
    }
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
        bankName: compte.bankName,
        bankReference: compte.bankReference,
        bankAccountHolder: compte.bankAccountHolder,
        referenceNumber,
        status: "CREE",
        // Porte la contrainte d'unicite : un seul ordre ACTIF par depense.
        activeExpenseId: expense.id,
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
          // Trace explicite quand le compte payé n'a PAS été approuvé avec la
          // dépense : c'est ce qui rend le cas repérable dans le journal.
          bankDetailsFrom: especes
            ? "n/a"
            : depenseSpecifieCompte
              ? "expense"
              : "treasury",
        },
        ip: req?.ip || null,
        userAgent: req?.get?.("user-agent")?.slice(0, 500) || null,
      },
    });

    return created;
  });

  return order;
}

/**
 * Annulation d'un ordre de paiement.
 *
 * Sans elle, un ordre emis avec un mauvais numero de compte figeait la depense
 * en EFFECTUER a vie — et la contrainte d'unicite rendait ce blocage absolu. En
 * pratique la tresorerie contournerait en creant une fausse depense, ce qui
 * pollue la comptabilite pour toujours.
 *
 * Mais annuler est un pouvoir, donc il est borne :
 *   CREE     — jamais imprime, la tresorerie annule seule
 *   IMPRIME  — le document est parti a la banque : SUPER_ADMIN uniquement
 *   EXECUTE  — l'argent est sorti : jamais. On enregistre un remboursement.
 * Sans ces bornes, la tresorerie pourrait seule annuler un ordre deja remis,
 * repasser la depense en APPROUVER et en emettre un autre vers un autre
 * beneficiaire, autant de fois qu'elle veut.
 */
export async function cancelPaymentOrder({ user, id, reason, req }) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.paymentOrder.findUnique({
      where: { id },
      select: { id: true, status: true, expenseId: true, referenceNumber: true },
    });

    if (!order) {
      const err = new Error("Ordre de paiement introuvable");
      err.status = 404;
      throw err;
    }

    if (order.status === "ANNULE") {
      const err = new Error("Cet ordre est déjà annulé");
      err.status = 409;
      throw err;
    }

    if (order.status === "EXECUTE") {
      const err = new Error(
        "Cet ordre a été exécuté : l'argent est sorti. Enregistrez un remboursement, pas une annulation.",
      );
      err.status = 409;
      throw err;
    }

    if (order.status === "IMPRIME" && user.role !== "SUPER_ADMIN") {
      const err = new Error(
        "Cet ordre a déjà été imprimé : seul le Super Admin peut l'annuler.",
      );
      err.status = 403;
      throw err;
    }

    // updateMany conditionne sur les statuts annulables : entre la lecture
    // ci-dessus et cette ecriture, un POST /:id/execute concurrent pouvait
    // basculer l'ordre en EXECUTE. L'annulation l'ecrasait alors, et la depense
    // redevenait decaissable alors que l'argent etait sorti.
    const { count } = await tx.paymentOrder.updateMany({
      where: { id, status: { in: ["CREE", "IMPRIME"] } },
      data: {
        status: "ANNULE",
        // Libere la contrainte : une reemission redevient possible.
        activeExpenseId: null,
        cancelledAt: new Date(),
        cancelledById: user.id,
        cancellationReason: reason,
      },
    });

    if (count === 0) {
      const err = new Error(
        "Cet ordre vient de changer d'état : il ne peut plus être annulé.",
      );
      err.status = 409;
      throw err;
    }

    // La depense redevient decaissable, elle ne repart pas a l'approbation :
    // la decision du Super Admin tient toujours, c'est l'execution qui a rate.
    await tx.expense.updateMany({
      where: { id: order.expenseId, status: "EFFECTUER" },
      data: { status: "APPROUVER" },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "PAYMENT_ORDER_CANCELLED",
        entity: "PaymentOrder",
        entityId: id,
        meta: {
          reason,
          previousStatus: order.status,
          referenceNumber: order.referenceNumber,
          expenseId: order.expenseId,
        },
        ip: req?.ip || null,
        userAgent: req?.get?.("user-agent")?.slice(0, 500) || null,
      },
    });

    return { message: "Ordre annulé. La dépense est de nouveau décaissable." };
  });
}

/**
 * L'argent a reellement quitte la banque.
 *
 * Corrige un mensonge de fond du tableau de bord : une depense passait en
 * EFFECTUER a la seconde ou le bon etait cree, avant meme d'etre imprime, alors
 * que le virement part des jours plus tard. « Engage » et « reellement paye »
 * sont deux chiffres differents.
 */
export async function markPaymentOrderExecuted({ user, id, executedAt, req }) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.paymentOrder.updateMany({
      where: { id, status: { in: ["CREE", "IMPRIME"] } },
      data: { status: "EXECUTE", executedAt: executedAt || new Date() },
    });

    if (count === 0) {
      const existe = await tx.paymentOrder.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!existe) {
        const err = new Error("Ordre de paiement introuvable");
        err.status = 404;
        throw err;
      }
      const err = new Error(
        existe.status === "EXECUTE"
          ? "Cet ordre est déjà marqué exécuté"
          : "Un ordre annulé ne peut pas être exécuté",
      );
      err.status = 409;
      throw err;
    }

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "PAYMENT_ORDER_EXECUTED",
        entity: "PaymentOrder",
        entityId: id,
        meta: { executedAt: executedAt || null },
        ip: req?.ip || null,
        userAgent: req?.get?.("user-agent")?.slice(0, 500) || null,
      },
    });

    return { message: "Ordre marqué exécuté." };
  });
}

export async function listPaymentOrders({ user } = {}) {
  // Le perimetre manquait : la route est ouverte a CAN_READ_MONEY, donc au
  // GESTIONNAIRE_DEPENSE, qui lisait TOUS les ordres et toutes les coordonnees
  // bancaires de tous les beneficiaires. Il ne voit desormais que les ordres
  // adosses a ses propres depenses.
  const where =
    user?.role === "GESTIONNAIRE_DEPENSE"
      ? { expense: { createdById: user.id } }
      : {};

  // Borne explicite : la requete renvoyait la table entiere, sans take ni
  // curseur, et la supervision ADMIN vient de s'ajouter comme lectrice.
  return prisma.paymentOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: includeOrder(),
  });
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

  if (order.status === "ANNULE" || order.status === "EXECUTE") {
    const err = new Error("Cet ordre n'est plus imprimable");
    err.status = 409;
    throw err;
  }

  // updateMany conditionne sur le statut source plutot qu'un update apres
  // lecture : deux impressions simultanees ne peuvent pas se marcher dessus.
  await prisma.paymentOrder.updateMany({
    where: { id, status: "CREE" },
    data: { status: "IMPRIME" },
  });

  const updated = await prisma.paymentOrder.findUnique({
    where: { id },
    include: includeOrder(),
  });

  await auditLog({ userId: user.id, action: "PAYMENT_ORDER_PRINT_MARKED", entity: "PaymentOrder", entityId: id, req, meta: { referenceNumber: updated.referenceNumber } });
  return updated;
}
