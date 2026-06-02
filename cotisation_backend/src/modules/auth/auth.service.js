import prisma from "../../config/prisma.js";
import { hashPassword, verifyPassword } from "../../utils/hash.js";
import { signAccessToken, signRefreshToken } from "../../utils/tokens.js";
import { auditLog } from "../../utils/audit.js";
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

      email: data.email,
      country: data.country,
      city: data.city,
      commune: isAssociation ? data.commune : null,

      associationStatusDocPath: isAssociation
        ? associationStatusDoc.path
        : null,
      representativeType: isAssociation ? data.representativeType : null,
      representativeName: isAssociation ? data.representativeName : null,
      representativePhone: isAssociation ? data.representativePhone : null,
      representativeAddress: isAssociation ? data.representativeAddress : null,
      representativeEmail: isAssociation ? data.representativeEmail : null,
      presidentIdDocPath: isAssociation ? presidentIdDoc.path : null,

      passwordHash,
      status: "PENDING_VERIFICATION",
      role: "CLIENT",

      // fichiers seulement si ADHERENT
      idDocPath: isAdherent ? idDoc.path : null,
      selfiePath: isAdherent ? selfie.path : null,
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

  try {
    const dbStart = performance.now();
    user = await prisma.user.findUnique({
      where: { email },
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
    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = signRefreshToken({ sub: user.id, role: user.role });
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