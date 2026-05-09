import prisma from "../../config/prisma.js";
import { hashPassword, verifyPassword } from "../../utils/hash.js";
import { signAccessToken, signRefreshToken } from "../../utils/tokens.js";
import { auditLog } from "../../utils/audit.js";

export async function createUser({ data, files, req }) {
  const isAdherent = data.accountType === "CLIENT_ADHERENT";
  const isAssociation = data.accountType === "ASSOCIATION";

  const idDoc = files?.idDoc?.[0];
  const selfie = files?.selfie?.[0];
  const presidentIdDoc = files?.presidentIdDoc?.[0];

  // ✅ Fichiers requis seulement pour ADHERENT
  if (isAdherent) {
    if (!idDoc || !selfie) {
      const err = new Error("ID Doc et selfie requis.");
      err.status = 400;
      throw err;
    }
  }

  if (isAssociation && !presidentIdDoc) {
    const err = new Error("Pièce d’identité du président requise.");
    err.status = 400;
    throw err;
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

      associationStatus: isAssociation ? data.associationStatus : null,
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
      associationStatus: true,
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

export async function loginUser({ email, password, req }) {
  const user = await prisma.user.findUnique({ where: { email } });

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

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    const err = new Error("Identifiants invalides.");
    err.status = 401;
    throw err;
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role });

  await auditLog({
    userId: user.id,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
    req,
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
      associationStatus: user.associationStatus,
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
      associationStatus: true,
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