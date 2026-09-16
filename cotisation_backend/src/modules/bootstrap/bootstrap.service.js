import prisma from "../../config/prisma.js";
import { auditLog } from "../../utils/audit.js";
import { hashUnusablePassword } from "../../utils/hash.js";
import { issueInvitation } from "../../utils/invitation.js";
import { sendInternalInviteMail } from "../../services/mail.service.js";

/**
 * Le module du compte d'amorcage. Il fait une chose : nommer l'Ougas Admin.
 *
 * Pourquoi il existe : l'Ougas Admin est le seul a pouvoir approuver une sortie
 * d'argent, et son role est le seul qu'aucun ecran ne sait attribuer — ni
 * l'admin, ni un autre Ougas Admin. Sans ce module, perdre l'unique Ougas Admin
 * gelait toutes les depenses jusqu'a un UPDATE manuel en production.
 *
 * Pourquoi il est si etroit : le compte capable de nommer l'approbateur ne doit
 * jamais pouvoir approuver lui-meme. Il ne lit aucun montant, aucun membre,
 * aucune cotisation — les trois fonctions ci-dessous sont sa surface complete.
 */

const OUGAS = "OUGAS_ADMIN";

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function ougasPublicSelect() {
  return {
    id: true,
    fullName: true,
    email: true,
    phone: true,
    status: true,
    createdAt: true,
    inviteTokenExpiresAt: true,
  };
}

export async function listOugasAdmins() {
  return prisma.user.findMany({
    where: { role: OUGAS },
    orderBy: { createdAt: "desc" },
    select: ougasPublicSelect(),
  });
}

export async function createOugasAdmin({ actorId, data, req }) {
  // Mot de passe inutilisable : le titulaire fixera le sien via l'invitation.
  // Le compte d'amorcage ne connait donc aucun secret permettant de se connecter
  // en tant qu'Ougas Admin — c'est ce qui l'empeche d'approuver a sa place.
  const passwordHash = await hashUnusablePassword();

  let created;
  try {
    created = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email.toLowerCase(),
        phone: data.phone,
        role: OUGAS,
        status: "PENDING_VERIFICATION",
        passwordHash,
        country: "N/A",
        city: "N/A",
      },
      select: ougasPublicSelect(),
    });
  } catch (err) {
    if (err?.code === "P2002") {
      const champs = Array.isArray(err.meta?.target)
        ? err.meta.target.join(", ")
        : "email ou téléphone";
      throw httpError(`Un compte utilise déjà ce ${champs}.`, 409);
    }
    throw err;
  }

  await auditLog({
    userId: actorId,
    action: "BOOTSTRAP_OUGAS_CREATED",
    entity: "User",
    entityId: created.id,
    req,
    meta: { email: created.email },
  });

  // L'envoi de l'email ne doit pas faire echouer la creation : si Brevo tombe,
  // le compte existe et l'invitation se renvoie depuis l'interface.
  let invitationSent = true;
  try {
    const { token, expiresAt } = await issueInvitation(created.id);
    await sendInternalInviteMail({
      email: created.email,
      fullName: created.fullName,
      role: OUGAS,
      token,
      expiresAt,
    });
  } catch (err) {
    invitationSent = false;
    console.error("[bootstrap] envoi d'invitation impossible:", err?.message);
    await auditLog({
      userId: actorId,
      action: "BOOTSTRAP_OUGAS_INVITE_SEND_FAILED",
      entity: "User",
      entityId: created.id,
      req,
      meta: { reason: err?.message },
    });
  }

  return { ...created, invitationSent };
}

export async function resendOugasInvitation({ actorId, userId, req }) {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, role: true, status: true },
  });

  if (!target) throw httpError("Utilisateur introuvable", 404);

  // Le role de la cible est re-verifie ici, pas seulement a la creation : sans
  // ce controle, un identifiant fabrique a la main ferait relancer l'invitation
  // — donc reinitialiser le jeton d'activation — de n'importe quel compte
  // interne. Le compte d'amorcage n'a d'autorite que sur les Ougas Admin.
  if (target.role !== OUGAS) {
    await auditLog({
      userId: actorId,
      action: "BOOTSTRAP_OUGAS_INVITE_RESENT_DENIED",
      entity: "User",
      entityId: userId,
      req,
      meta: { targetRole: target.role, reason: "NOT_OUGAS_ADMIN" },
    });
    throw httpError("Ce compte n'est pas un Ougas Admin", 403);
  }

  if (target.status !== "PENDING_VERIFICATION") {
    throw httpError("Ce compte est déjà activé", 409);
  }

  const { token, expiresAt } = await issueInvitation(userId);
  await sendInternalInviteMail({
    email: target.email,
    fullName: target.fullName,
    role: OUGAS,
    token,
    expiresAt,
  });

  await auditLog({
    userId: actorId,
    action: "BOOTSTRAP_OUGAS_INVITE_RESENT",
    entity: "User",
    entityId: userId,
    req,
  });

  return { invitationSent: true, expiresAt };
}
