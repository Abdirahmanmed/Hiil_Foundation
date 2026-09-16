import prisma from "../../config/prisma.js";
import * as cacBank from "../../services/cacBank.service.js";
import * as contributions from "../contributions/contributions.service.js";

function getIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.ip;
}

/**
 * Une cotisation est payable tant qu'elle n'est pas annulee.
 *
 * L'ancienne regle exigeait `status === "PENDING_CONSENT"` et refusait toute
 * cotisation portant deja une reference CAC : des qu'une cotisation etait
 * ACTIVE, la DEUXIEME echeance ne pouvait plus JAMAIS etre payee par ce canal.
 * Ce point-la tuait la recurrence a lui seul. C'est desormais l'unicite de la
 * cle d'idempotence de l'encaissement qui empeche de payer deux fois la meme
 * echeance, pas le statut de l'engagement.
 */
function assertPayable(subscription) {
  if (subscription.status === "CANCELLED") {
    const err = new Error("Cette cotisation est annulée.");
    err.status = 409;
    throw err;
  }
}

async function getOwnedSubscription(userId, subscriptionId) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, userId },
    include: { user: true },
  });

  if (!subscription) {
    const err = new Error("Cotisation introuvable");
    err.status = 404;
    throw err;
  }

  return subscription;
}

export async function initiateSubscriptionPayment(userId, subscriptionId, req) {
  const subscription = await getOwnedSubscription(userId, subscriptionId);
  assertPayable(subscription);

  if (!subscription.user.phone) {
    const err = new Error("Telephone client manquant.");
    err.status = 400;
    throw err;
  }

  // L'encaissement est cree AVANT l'appel reseau : sa cle d'idempotence, stable
  // pour une echeance donnee, est ce qu'on envoie a la banque. Deux clics
  // produisent donc la meme reference cote CAC au lieu de deux paiements.
  const contribution = await contributions.openContribution({
    subscription,
    channel: "CAC",
  });

  let response;
  try {
    response = await cacBank.initiatePayment({
      customerMobile: subscription.user.phone,
      description: `Cotisation Hiil Foundation ${subscription.id}`,
      venderRef: contribution.idempotencyKey,
      amount: subscription.amount,
      // La devise vient de la SOUSCRIPTION, plus d'une variable d'environnement :
      // un membre qui choisissait USD etait debite en DJF.
      currency: subscription.currency,
    });
  } catch (err) {
    // Un timeout n'est pas un echec : la banque a pu encaisser. C'est la
    // reconciliation qui tranchera, surtout pas nous.
    await contributions.markContributionOutcome({
      contributionId: contribution.id,
      status: err?.code === "ETIMEDOUT" || /timeout/i.test(err?.message || "") ? "TIMEOUT" : "FAILED",
      rawResponse: { error: err?.message || String(err) },
    });
    throw err;
  }

  const paymentRequestId = response?.paymentRequestId;
  if (!paymentRequestId) {
    await contributions.markContributionOutcome({
      contributionId: contribution.id,
      status: "FAILED",
      rawResponse: response,
    });
    const err = new Error("CAC Bank n'a pas retourne de paymentRequestId.");
    err.status = 502;
    throw err;
  }

  await prisma.contribution.update({
    where: { id: contribution.id },
    data: { reference: String(paymentRequestId), rawResponse: response },
  });

  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      cacPaymentRequestId: String(paymentRequestId),
      cacStatus: "OTP_SENT",
      cacRawResponse: response,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "CAC_PAYMENT_INITIATE",
      entity: "Subscription",
      entityId: updated.id,
      meta: {
        amount: subscription.amount,
        currency: subscription.currency,
        cacStatus: "OTP_SENT",
      },
      ip: getIp(req),
      userAgent: req.headers["user-agent"] || null,
    },
  });

  return {
    message: "OTP envoye par SMS",
    paymentRequestId: String(paymentRequestId),
    contributionId: contribution.id,
    subscription: updated,
  };
}

export async function confirmSubscriptionPayment(userId, subscriptionId, otp, req) {
  const subscription = await getOwnedSubscription(userId, subscriptionId);
  assertPayable(subscription);

  if (!subscription.cacPaymentRequestId || subscription.cacStatus !== "OTP_SENT") {
    const err = new Error("Aucun paiement CAC en attente de confirmation.");
    err.status = 409;
    throw err;
  }

  // L'encaissement ouvert a l'initiation, retrouve par la reference du
  // paymentRequestId.
  //
  // Surtout PAS re-derive de nextDueDate via openContribution : la confirmation
  // precedente vient justement de l'avancer, donc la cle porterait sur
  // l'echeance SUIVANTE. Rejouer la confirmation cinq fois — le plafond du
  // limiteur — fabriquait cinq encaissements CONFIRMED et poussait l'echeance
  // de cinq mois, sans qu'un franc soit verse.
  const contribution = await prisma.contribution.findFirst({
    where: {
      subscriptionId: subscription.id,
      reference: String(subscription.cacPaymentRequestId),
      status: { in: ["PENDING", "TIMEOUT"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!contribution) {
    const err = new Error(
      "Aucun encaissement en attente pour ce paiement. Relancez l'opération.",
    );
    err.status = 409;
    throw err;
  }

  const response = await cacBank.confirmPayment({
    paymentRequestId: subscription.cacPaymentRequestId,
    otp,
  });

  // CONFIRMED et l'avancement de l'echeance dans la meme transaction, et
  // conditionnes sur l'etat source : confirmer deux fois renvoie 409 et
  // nextDueDate ne bouge pas.
  const { nextDueDate } = await contributions.confirmContribution({
    contributionId: contribution.id,
    reference: response?.reference || String(response?.confirmReference || ""),
    rawResponse: response,
    userId,
    req,
  });

  const paidAt = new Date();
  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      cacConfirmReference: response?.confirmReference
        ? String(response.confirmReference)
        : null,
      cacReference: response?.reference || null,
      cacStatus: "CONFIRMED",
      cacRawResponse: response,
      // Consomme le jeton d'initiation : une seconde confirmation ne trouvera
      // plus ni OTP_SENT, ni encaissement en attente portant cette référence.
      cacPaymentRequestId: null,
      paidAt,
      consentAccepted: true,
      consentVersion: subscription.consentVersion || "cac-payment-v1",
      consentAt: subscription.consentAt || paidAt,
      consentIp: subscription.consentIp || getIp(req),
      consentUserAgent:
        subscription.consentUserAgent || req.headers["user-agent"] || null,
      status: "ACTIVE",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "CAC_PAYMENT_CONFIRM",
      entity: "Subscription",
      entityId: updated.id,
      meta: {
        cacStatus: "CONFIRMED",
        cacReference: updated.cacReference,
      },
      ip: getIp(req),
      userAgent: req.headers["user-agent"] || null,
    },
  });

  return {
    message: "Paiement confirme",
    subscription: updated,
    nextDueDate,
  };
}

export async function getSubscriptionPaymentStatus(userId, subscriptionId) {
  const subscription = await getOwnedSubscription(userId, subscriptionId);

  return {
    subscriptionId: subscription.id,
    status: subscription.status,
    cacStatus: subscription.cacStatus,
    cacReference: subscription.cacReference,
    cacConfirmReference: subscription.cacConfirmReference,
    paidAt: subscription.paidAt,
  };
}
