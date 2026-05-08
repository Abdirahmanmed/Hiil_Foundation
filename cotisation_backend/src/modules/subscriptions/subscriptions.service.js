import prisma from "../../config/prisma.js";

function getIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.ip;
}

export const createSubscription = async (userId, data, req) => {
  // Normalisation payload selon méthode
  const payload = {
    userId,
    bankCountry: data.bankCountry.trim(),
    bankName: data.bankName.trim(),
    currency: data.currency.trim(),

    paymentMethod: data.paymentMethod,

    // BANK_TRANSFER
    mode: data.paymentMethod === "BANK_TRANSFER" ? data.mode : null,
    accountNumber:
      data.paymentMethod === "BANK_TRANSFER"
        ? (data.accountNumber || "").trim()
        : null,
    rib: data.paymentMethod === "BANK_TRANSFER" ? data.rib || null : null,
    swiftBic:
      data.paymentMethod === "BANK_TRANSFER" ? data.swiftBic || null : null,

    // WALLET (Djibouti only, déjà validé par Zod)
    walletProvider:
      data.paymentMethod === "WALLET" ? data.walletProvider : null,
    walletAccount:
      data.paymentMethod === "WALLET"
        ? (data.walletAccount || "").trim()
        : null,

    amount: data.amount,
    frequency: data.frequency,

    // Consent par défaut
    status: "PENDING_CONSENT",
    consentAccepted: false,
    consentVersion: null,
    consentAt: null,
    consentIp: null,
    consentUserAgent: null,
  };

  // (Option) empêcher plusieurs subscriptions actives si tu veux
  // const existing = await prisma.subscription.findFirst({ where: { userId, status: { in: ["ACTIVE", "ACTIVE_MANUAL"] } } });
  // if (existing) throw Object.assign(new Error("Vous avez déjà une cotisation active."), { status: 409 });

  const created = await prisma.subscription.create({ data: payload });

  // Audit
  await prisma.auditLog.create({
    data: {
      userId,
      action: "SUBSCRIPTION_CREATE",
      entity: "Subscription",
      entityId: created.id,
      meta: {
        paymentMethod: payload.paymentMethod,
        bankCountry: payload.bankCountry,
        bankName: payload.bankName,
        currency: payload.currency,
        amount: payload.amount,
        frequency: payload.frequency,
        mode: payload.mode,
        walletProvider: payload.walletProvider,
      },
      ip: getIp(req),
      userAgent: req.headers["user-agent"] || null,
    },
  });

  return created;
};

export const listMySubscriptions = async (userId) => {
  return prisma.subscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

export const getMySubscriptionById = async (userId, id) => {
  const sub = await prisma.subscription.findFirst({
    where: { id, userId },
  });
  if (!sub) {
    const err = new Error("Cotisation introuvable");
    err.status = 404;
    throw err;
  }
  return sub;
};

export const acceptConsent = async (userId, id, accepted, req) => {
  const sub = await prisma.subscription.findFirst({
    where: { id, userId },
  });

  if (!sub) {
    const err = new Error("Cotisation introuvable");
    err.status = 404;
    throw err;
  }

  if (!accepted) {
    const err = new Error("Vous devez accepter les conditions pour continuer.");
    err.status = 400;
    throw err;
  }

  const updated = await prisma.subscription.update({
    where: { id },
    data: {
      consentAccepted: true,
      consentVersion: "v1",
      consentAt: new Date(),
      consentIp: getIp(req),
      consentUserAgent: req.headers["user-agent"] || null,
      status:
        sub.paymentMethod === "BANK_TRANSFER" && sub.mode === "MANUAL"
          ? "ACTIVE_MANUAL"
          : "ACTIVE",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "SUBSCRIPTION_CONSENT",
      entity: "Subscription",
      entityId: updated.id,
      meta: { accepted: true, version: "v1" },
      ip: getIp(req),
      userAgent: req.headers["user-agent"] || null,
    },
  });

  return updated;
};
