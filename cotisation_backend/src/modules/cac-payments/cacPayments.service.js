import prisma from "../../config/prisma.js";
import * as cacBank from "../../services/cacBank.service.js";

function getIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.ip;
}

function assertPayable(subscription) {
  if (subscription.status !== "PENDING_CONSENT") {
    const err = new Error("Cette cotisation n'est pas en attente de paiement.");
    err.status = 409;
    throw err;
  }

  if (subscription.cacReference) {
    const err = new Error("Cette cotisation a deja un paiement CAC confirme.");
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

function buildVenderRef(subscription) {
  return `SUB-${subscription.id}-${Date.now()}`;
}

export async function initiateSubscriptionPayment(userId, subscriptionId, req) {
  const subscription = await getOwnedSubscription(userId, subscriptionId);
  assertPayable(subscription);

  if (!subscription.user.phone) {
    const err = new Error("Telephone client manquant.");
    err.status = 400;
    throw err;
  }

  const venderRef = buildVenderRef(subscription);
  const response = await cacBank.initiatePayment({
    customerMobile: subscription.user.phone,
    description: `Cotisation Hiil Foundation ${subscription.id}`,
    venderRef,
    amount: subscription.amount,
  });

  const paymentRequestId = response?.paymentRequestId;
  if (!paymentRequestId) {
    const err = new Error("CAC Bank n'a pas retourne de paymentRequestId.");
    err.status = 502;
    throw err;
  }

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
    subscription: updated,
  };
}

export async function confirmSubscriptionPayment(userId, subscriptionId, otp, req) {
  const subscription = await getOwnedSubscription(userId, subscriptionId);
  assertPayable(subscription);

  if (!subscription.cacPaymentRequestId) {
    const err = new Error("Paiement CAC non initie.");
    err.status = 400;
    throw err;
  }

  const response = await cacBank.confirmPayment({
    paymentRequestId: subscription.cacPaymentRequestId,
    otp,
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
