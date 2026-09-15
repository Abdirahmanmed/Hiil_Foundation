import crypto from "node:crypto";

import prisma from "../../config/prisma.js";
import { hashInviteToken, hashPassword, verifyPassword } from "../../utils/hash.js";
import { signAccessToken, signRefreshToken } from "../../utils/tokens.js";
import { auditLog } from "../../utils/audit.js";
import { invalidateUserCache } from "../../middlewares/auth.js";
import { sendPasswordResetMail } from "../../services/mail.service.js";
import { toStorageKey } from "../../utils/upload.js";
import { performance } from "node:perf_hooks";

export async function createUser({ data, files, req }) {
  const isAdherent = data.accountType === "CLIENT_ADHERENT";
  const isAssociation = data.accountType === "ASSOCIATION";

  const idDoc = files?.idDoc?.[0];
  const selfie = files?.selfie?.[0];
  const presidentIdDoc = files?.presidentIdDoc?.[0];
  const associationStatusDoc = files?.associationStatusDoc?.[0];

  // ✅ Fichiers requis seulement pour ADHERENT
  if (isAdherent) {
    if (!idDoc || !selfie) {
      const err = new Error("ID Doc et selfie requis.");
      err.status = 400;
      throw err;
    }
  }

  if (isAssociation) {
    if (!presidentIdDoc) {
      const err = new Error("Pièce d’identité du président requise.");
      err.status = 400;
      throw err;
    }

    if (!associationStatusDoc) {
      const err = new Error("Statut de l’association requis.");
      err.status = 400;
      throw err;
    }
  }

  const normalizedEmail = normalizeEmail(data.email);
  const passwordHash = await hashPassword(data.password);

  // ✅ fullName obligatoire dans Prisma -> pour association on met companyName
  const fullNameFinal = isAssociation ? data.companyName : data.fullName;

  const user = await prisma.user.create({
    data: {
      accountType: data.accountType,

      fullName: fullNameFinal,
      companyName: isAssociation ? data.companyName : null,

      phone: data.phone,
      phone2: null,

      email: normalizedEmail,
      country: data.country,
      city: data.city,
      commune: isAssociation ? data.commune : null,

      associationStatusDocPath: isAssociation
        ? toStorageKey(associationStatusDoc)
        : null,
      representativeType: isAssociation ? data.representativeType : null,
      representativeName: isAssociation ? data.representativeName : null,
      representativePhone: isAssociation ? data.representativePhone : null,
      representativeAddress: isAssociation ? data.representativeAddress : null,
      representativeEmail: isAssociation ? data.representativeEmail : null,
      presidentIdDocPath: isAssociation ? toStorageKey(presidentIdDoc) : null,

      passwordHash,
      status: "PENDING_VERIFICATION",
      role: "CLIENT",

      // fichiers seulement si ADHERENT
      idDocPath: isAdherent ? toStorageKey(idDoc) : null,
      selfiePath: isAdherent ? toStorageKey(selfie) : null,
    },
    select: {
      id: true,
      fullName: true,
      companyName: true,
      phone: true,
      phone2: true,
      email: true,
      country: true,
      city: true,
      commune: true,
      associationStatusDocPath: true,
      representativeType: true,
      representativeName: true,
      representativePhone: true,
      representativeAddress: true,
      representativeEmail: true,
      status: true,
      role: true,
      accountType: true,
      createdAt: true,
    },
  });

  await auditLog({
    userId: user.id,
    action: "REGISTER",
    entity: "User",
    entityId: user.id,
    req,
    meta: {
      email: user.email,
      phone: user.phone,
      accountType: user.accountType,
    },
  });

  return user;
}

function roundMs(start, end = performance.now()) {
  return Math.round((end - start) * 10) / 10;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function logLoginPerf({ totalStart, dbMs = 0, passwordVerifyMs = 0, tokenSignMs = 0, auditMs = 0, status, userId }) {
  console.log("[perf] auth.login", {
    status,
    userId: userId || null,
    totalMs: roundMs(totalStart),
    dbFindUserMs: dbMs,
    passwordVerifyMs,
    tokenSignMs,
    auditMs,
  });
}

export async function loginUser({ email, password, req }) {
  const totalStart = performance.now();
  let dbMs = 0;
  let passwordVerifyMs = 0;
  let tokenSignMs = 0;
  let auditMs = 0;
  let user;
  const normalizedEmail = normalizeEmail(email);

  try {
    const dbStart = performance.now();
    user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        passwordHash: true,
        fullName: true,
        companyName: true,
        phone: true,
        phone2: true,
        email: true,
        country: true,
        city: true,
        commune: true,
        associationStatusDocPath: true,
        representativeType: true,
        representativeName: true,
        representativePhone: true,
        representativeAddress: true,
        representativeEmail: true,
        role: true,
        status: true,
        accountType: true,
        tokenVersion: true,
      },
    });
    dbMs = roundMs(dbStart);

    if (!user) {
      const err = new Error("Identifiants invalides.");
      err.status = 401;
      throw err;
    }

    if (user.status !== "ACTIVE") {
      const err = new Error("Compte non actif. Vérifie ton OTP.");
      err.status = 403;
      throw err;
    }

    const passwordVerifyStart = performance.now();
    const ok = await verifyPassword(user.passwordHash, password);
    passwordVerifyMs = roundMs(passwordVerifyStart);
    if (!ok) {
      const err = new Error("Identifiants invalides.");
      err.status = 401;
      throw err;
    }

    const tokenSignStart = performance.now();
    const accessToken = signAccessToken({ sub: user.id, role: user.role, tv: user.tokenVersion });
    const refreshToken = signRefreshToken({ sub: user.id, role: user.role, tv: user.tokenVersion });
    tokenSignMs = roundMs(tokenSignStart);

    const auditStart = performance.now();
    await auditLog({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      req,
    });
    auditMs = roundMs(auditStart);

    logLoginPerf({
      totalStart,
      dbMs,
      passwordVerifyMs,
      tokenSignMs,
      auditMs,
      status: "success",
      userId: user.id,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        companyName: user.companyName,
        phone: user.phone,
        phone2: user.phone2,
        email: user.email,
        country: user.country,
        city: user.city,
        commune: user.commune,
        associationName: user.companyName,
        associationPhone: user.phone,
        associationCountry: user.country,
        associationStatusDocPath: user.associationStatusDocPath,
        representativeType: user.representativeType,
        representativeName: user.representativeName,
        representativePhone: user.representativePhone,
        representativeAddress: user.representativeAddress,
        representativeEmail: user.representativeEmail,
        role: user.role,
        status: user.status,
        accountType: user.accountType,
      },
    };
  } catch (err) {
    // Seuls les succes etaient journalises : une attaque par force brute sur le
    // compte SUPER_ADMIN ne laissait AUCUNE trace. userId est nullable dans le
    // schema, c'est prevu pour le cas de l'email inconnu.
    // Jamais le mot de passe dans meta — seulement la raison.
    await auditLog({
      userId: user?.id || null,
      action: "LOGIN_FAILED",
      entity: "User",
      entityId: user?.id || null,
      req,
      meta: { email: normalizedEmail, reason: err?.message || "unknown" },
    });

    logLoginPerf({
      totalStart,
      dbMs,
      passwordVerifyMs,
      tokenSignMs,
      auditMs,
      status: err?.status ? `error_${err.status}` : "error",
      userId: user?.id,
    });
    throw err;
  }
}

export async function getMe({ userId }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      companyName: true,
      phone: true,
      phone2: true,
      email: true,
      country: true,
      city: true,
      commune: true,
      associationStatusDocPath: true,
      representativeType: true,
      representativeName: true,
      representativePhone: true,
      representativeAddress: true,
      representativeEmail: true,
      role: true,
      status: true,
      accountType: true,
      idDocPath: true,
      selfiePath: true,
      createdAt: true,
    },
  });

  return user;
}

export async function changePassword({
  userId,
  currentPassword,
  newPassword,
  req,
}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user) {
    const err = new Error("Utilisateur introuvable.");
    err.status = 404;
    throw err;
  }

  const isCurrentPasswordValid = await verifyPassword(
    user.passwordHash,
    currentPassword,
  );

  if (!isCurrentPasswordValid) {
    const err = new Error("Mot de passe actuel incorrect.");
    err.status = 400;
    throw err;
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
    select: { id: true },
  });

  await auditLog({
    userId: user.id,
    action: "PASSWORD_CHANGED",
    entity: "User",
    entityId: user.id,
    req,
    meta: { email: user.email },
  });
}

/**
 * Activation d'un compte interne par son titulaire.
 *
 * C'est le seul chemin par lequel un compte cree par un tiers obtient un mot de
 * passe : le createur n'en a jamais connu aucun. Le jeton est a usage unique et
 * il est efface dans la meme transaction que l'ecriture du mot de passe.
 */
export async function acceptInvitation({ token, password, req }) {
  const invalid = () => {
    const err = new Error("Lien d'invitation invalide ou expiré.");
    err.status = 400;
    return err;
  };

  const user = await prisma.user.findUnique({
    where: { inviteTokenHash: hashInviteToken(token) },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      inviteTokenExpiresAt: true,
    },
  });

  if (!user) throw invalid();

  if (!user.inviteTokenExpiresAt || user.inviteTokenExpiresAt < new Date()) {
    await auditLog({
      userId: user.id,
      action: "INVITE_ACCEPT_FAILED",
      entity: "User",
      entityId: user.id,
      req,
      meta: { reason: "EXPIRED" },
    });
    throw invalid();
  }

  if (user.status !== "PENDING_VERIFICATION") {
    await auditLog({
      userId: user.id,
      action: "INVITE_ACCEPT_FAILED",
      entity: "User",
      entityId: user.id,
      req,
      meta: { reason: "STATUS", status: user.status },
    });
    throw invalid();
  }

  const passwordHash = await hashPassword(password);

  // updateMany conditionne sur le hash du jeton : deux requetes concurrentes ne
  // peuvent pas activer le compte deux fois, c'est Postgres qui arbitre.
  const { count } = await prisma.user.updateMany({
    where: {
      id: user.id,
      inviteTokenHash: hashInviteToken(token),
      status: "PENDING_VERIFICATION",
    },
    data: {
      passwordHash,
      status: "ACTIVE",
      inviteTokenHash: null,
      inviteTokenExpiresAt: null,
    },
  });

  if (count === 0) throw invalid();

  await auditLog({
    userId: user.id,
    action: "INVITE_ACCEPTED",
    entity: "User",
    entityId: user.id,
    req,
    meta: { role: user.role },
  });

  return { email: user.email, role: user.role };
}

const RESET_TTL_MINUTES = 60;

/**
 * Demande de reinitialisation.
 *
 * Repond TOUJOURS de la meme facon, que l'email existe ou non : sinon la route
 * devient un enumerateur de comptes. Un compte encore en invitation est renvoye
 * vers son lien d'activation, pas vers une reinitialisation.
 */
export async function requestPasswordReset({ email, req }) {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, fullName: true, status: true, inviteTokenHash: true },
  });

  if (!user || user.status === "BLOCKED" || user.inviteTokenHash) {
    await auditLog({
      userId: user?.id || null,
      action: "PASSWORD_RESET_REQUESTED_IGNORED",
      entity: "User",
      entityId: user?.id || null,
      req,
      meta: { email: normalizedEmail },
    });
    return;
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetTokenHash: hashInviteToken(token), resetTokenExpiresAt: expiresAt },
  });

  await sendPasswordResetMail({
    email: user.email,
    fullName: user.fullName,
    token,
    expiresAt,
  });

  await auditLog({
    userId: user.id,
    action: "PASSWORD_RESET_REQUESTED",
    entity: "User",
    entityId: user.id,
    req,
  });
}

/**
 * Application de la reinitialisation.
 *
 * Le jeton est a usage unique et consomme dans la meme transaction que
 * l'ecriture du mot de passe. tokenVersion est incremente : TOUTES les sessions
 * ouvertes tombent, ce qui est le comportement attendu si le compte a ete
 * compromis.
 */
export async function resetPassword({ token, password, req }) {
  const invalide = () => {
    const err = new Error("Lien de réinitialisation invalide ou expiré.");
    err.status = 400;
    return err;
  };

  const user = await prisma.user.findUnique({
    where: { resetTokenHash: hashInviteToken(token) },
    select: { id: true, email: true, resetTokenExpiresAt: true, status: true },
  });

  if (!user) throw invalide();
  if (!user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) throw invalide();
  if (user.status === "BLOCKED") throw invalide();

  const passwordHash = await hashPassword(password);

  const { count } = await prisma.user.updateMany({
    where: { id: user.id, resetTokenHash: hashInviteToken(token) },
    data: {
      passwordHash,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      tokenVersion: { increment: 1 },
      // Un compte suspendu ne se reactive pas en changeant de mot de passe.
      status: user.status === "PENDING_VERIFICATION" ? "ACTIVE" : user.status,
    },
  });

  if (count === 0) throw invalide();

  invalidateUserCache(user.id);

  await auditLog({
    userId: user.id,
    action: "PASSWORD_RESET_COMPLETED",
    entity: "User",
    entityId: user.id,
    req,
    meta: { email: user.email },
  });

  return { email: user.email };
}
