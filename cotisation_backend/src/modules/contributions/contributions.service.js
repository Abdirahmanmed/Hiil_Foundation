import prisma from "../../config/prisma.js";
import {
  addPeriods,
  idempotencyKeyFor,
  overdueDays,
  periodStartFor,
} from "../../utils/schedule.js";

/**
 * Les encaissements.
 *
 * Subscription porte l'ENGAGEMENT, Contribution porte l'ARGENT. Les confondre
 * etait la cause racine du chiffre ambigu du tableau de bord : un simple clic
 * de consentement faisait passer une cotisation en ACTIVE, et ce statut etait
 * additionne comme s'il s'agissait d'une recette.
 */

/**
 * Ouvre un encaissement pour l'echeance en cours, ou renvoie celui qui existe
 * deja. L'unicite est portee par la base via idempotencyKey : deux clics
 * simultanes ne peuvent pas produire deux encaissements pour la meme echeance.
 */
export async function openContribution({ subscription, channel, periodStart }) {
  const periode = periodStartFor(
    periodStart || subscription.nextDueDate || new Date(),
  );
  const cle = idempotencyKeyFor(subscription.id, periode);

  const existante = await prisma.contribution.findUnique({
    where: { idempotencyKey: cle },
  });

  if (existante) {
    if (existante.status === "CONFIRMED") {
      const err = new Error("Cette échéance est déjà réglée.");
      err.status = 409;
      throw err;
    }
    return existante;
  }

  return prisma.contribution.create({
    data: {
      subscriptionId: subscription.id,
      amount: subscription.amount,
      currency: subscription.currency,
      periodStart: periode,
      status: "PENDING",
      channel,
      idempotencyKey: cle,
    },
  });
}

/**
 * L'argent est arrive.
 *
 * Le passage a CONFIRMED et l'avancement de l'echeance sont dans la meme
 * transaction, et conditionnes sur l'etat source : confirmer deux fois renvoie
 * 409 et `nextDueDate` ne bouge pas.
 */
export async function confirmContribution({ contributionId, reference, rawResponse, userId, req }) {
  return prisma.$transaction(async (tx) => {
    const contribution = await tx.contribution.findUnique({
      where: { id: contributionId },
      include: { subscription: { select: { id: true, frequency: true, nextDueDate: true } } },
    });

    if (!contribution) {
      const err = new Error("Encaissement introuvable");
      err.status = 404;
      throw err;
    }

    const { count } = await tx.contribution.updateMany({
      where: { id: contributionId, status: { in: ["PENDING", "TIMEOUT"] } },
      data: {
        status: "CONFIRMED",
        paidAt: new Date(),
        reference: reference ?? contribution.reference,
        rawResponse: rawResponse ?? contribution.rawResponse,
      },
    });

    if (count === 0) {
      const err = new Error(
        contribution.status === "CONFIRMED"
          ? "Cette échéance est déjà réglée."
          : "Cet encaissement ne peut plus être confirmé.",
      );
      err.status = 409;
      throw err;
    }

    // L'echeance avance depuis la periode couverte, pas depuis aujourd'hui :
    // un paiement en retard ne decale pas tout le calendrier.
    const prochaine = addPeriods(
      contribution.periodStart,
      contribution.subscription.frequency,
    );

    await tx.subscription.update({
      where: { id: contribution.subscriptionId },
      data: { nextDueDate: prochaine },
    });

    await tx.auditLog.create({
      data: {
        userId: userId || null,
        action: "CONTRIBUTION_CONFIRMED",
        entity: "Contribution",
        entityId: contributionId,
        meta: {
          subscriptionId: contribution.subscriptionId,
          amount: contribution.amount,
          currency: contribution.currency,
          channel: contribution.channel,
          reference: reference ?? null,
          nextDueDate: prochaine.toISOString(),
        },
        ip: req?.ip || null,
        userAgent: req?.get?.("user-agent")?.slice(0, 500) || null,
      },
    });

    return { contributionId, nextDueDate: prochaine };
  });
}

/**
 * Echec ou absence de reponse.
 *
 * TIMEOUT n'est PAS FAILED : la banque a pu encaisser de son cote. Seule la
 * reconciliation tranche, et un TIMEOUT reste confirmable.
 */
export async function markContributionOutcome({ contributionId, status, reference, rawResponse }) {
  if (!["FAILED", "TIMEOUT"].includes(status)) {
    throw new Error(`Issue invalide : ${status}`);
  }

  await prisma.contribution.updateMany({
    where: { id: contributionId, status: "PENDING" },
    data: { status, reference, rawResponse },
  });
}

export async function listContributions({ subscriptionId }) {
  return prisma.contribution.findMany({
    where: { subscriptionId },
    orderBy: { periodStart: "desc" },
    take: 100,
  });
}

/** Vue « ou en est cette cotisation », calculee a la lecture. */
export function scheduleSummary(subscription) {
  return {
    nextDueDate: subscription.nextDueDate,
    overdueDays: overdueDays(subscription.nextDueDate),
    isOverdue: overdueDays(subscription.nextDueDate) > 0,
  };
}
