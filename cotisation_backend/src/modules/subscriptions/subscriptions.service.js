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

  // Un seul mandat ouvert par membre.
  //
  // Ce garde-fou était écrit puis commenté : un membre pouvait créer un nombre
  // illimité de cotisations ACTIVE, toutes additionnées dans les statistiques
  // présentées au conseil. Les versements supplémentaires — don ponctuel,
  // rattrapage — sont des Contribution rattachées au mandat existant, pas de
  // nouveaux mandats. C'est ce qui rend le compteur « nombre de cotisants »
  // égal au nombre de personnes.
  const existante = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["PENDING_CONSENT", "ACTIVE", "ACTIVE_MANUAL"] },
    },
    select: { id: true, status: true },
  });

  if (existante) {
    const err = new Error(
      "Vous avez déjà une cotisation en cours. Modifiez-la plutôt que d'en créer une seconde.",
    );
    err.status = 409;
    throw err;
  }

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

/**
 * Modifier son mandat.
 *
 * Seuls le montant et la periodicite sont modifiables : changer de canal de
 * paiement revient a signer un autre mandat, avec un autre consentement. Les
 * encaissements deja confirmes ne sont pas touches — on ne recrit pas le passe.
 */
export const updateMySubscription = async (userId, id, data, req) => {
  const sub = await prisma.subscription.findFirst({ where: { id, userId } });
  if (!sub) {
    const err = new Error("Cotisation introuvable");
    err.status = 404;
    throw err;
  }

  if (sub.status === "CANCELLED") {
    const err = new Error("Cette cotisation est annulée.");
    err.status = 409;
    throw err;
  }

  const updated = await prisma.subscription.update({
    where: { id },
    data: {
      amount: data.amount ?? sub.amount,
      frequency: data.frequency ?? sub.frequency,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "SUBSCRIPTION_UPDATED",
      entity: "Subscription",
      entityId: id,
      // Avant / après : sans cela, personne ne peut dire six mois plus tard
      // que le montant a changé, ni dans quel sens.
      meta: {
        from: { amount: sub.amount, frequency: sub.frequency },
        to: { amount: updated.amount, frequency: updated.frequency },
      },
      ip: getIp(req),
      userAgent: req.headers["user-agent"] || null,
    },
  });

  return updated;
};

/**
 * Annuler son mandat.
 *
 * Le mandat s'arrete, les encaissements passes restent : ils sont de l'argent
 * reellement recu, pas une intention. C'est aussi ce qui libere le membre pour
 * en signer un nouveau, le garde-fou anti-doublon n'admettant qu'un mandat
 * ouvert a la fois.
 */
export const cancelMySubscription = async (userId, id, req) => {
  const { count } = await prisma.subscription.updateMany({
    where: { id, userId, status: { in: ["DRAFT", "PENDING_CONSENT", "ACTIVE", "ACTIVE_MANUAL"] } },
    data: { status: "CANCELLED", nextDueDate: null },
  });

  if (count === 0) {
    const existe = await prisma.subscription.findFirst({ where: { id, userId } });
    const err = new Error(
      existe ? "Cette cotisation est déjà annulée." : "Cotisation introuvable",
    );
    err.status = existe ? 409 : 404;
    throw err;
  }

  await prisma.auditLog.create({
    data: {
      userId,
      action: "SUBSCRIPTION_CANCELLED",
      entity: "Subscription",
      entityId: id,
      ip: getIp(req),
      userAgent: req.headers["user-agent"] || null,
    },
  });

  return { message: "Cotisation annulée." };
};
