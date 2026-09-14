import prisma from "../../config/prisma.js";
import { auditLog } from "../../utils/audit.js";
import { sendPublicSubmissionNotification } from "../../services/mail.service.js";

function emptyToNull(value) {
  const trimmed = typeof value === "string" ? value.trim() : value;
  return trimmed ? trimmed : null;
}

/**
 * Enregistre une candidature deposee depuis la vitrine publique.
 *
 * L'ecriture en base est la seule chose qui doit reussir : la notification par
 * email est un confort. Si Brevo tombe, la candidature est deja sauvegardee —
 * c'est exactement l'inverse du comportement precedent, ou l'ecran de
 * remerciement s'affichait alors que rien n'etait conserve nulle part.
 */
export async function recordPublicSubmission({ data, req }) {
  const isProject = data.kind === "PROJECT_PROPOSAL";

  const submission = await prisma.publicSubmission.create({
    data: {
      kind: data.kind,
      fullName: data.fullName,
      email: data.email,
      organization: isProject ? emptyToNull(data.organization) : null,
      theme: isProject ? emptyToNull(data.theme) : null,
      message: isProject ? data.message : null,
      skills: isProject ? null : emptyToNull(data.skills),
      availability: isProject ? null : emptyToNull(data.availability),
      ip: req?.ip || null,
      userAgent: req?.get?.("user-agent")?.slice(0, 500) || null,
    },
    select: { id: true, kind: true, createdAt: true },
  });

  await auditLog({
    userId: null,
    action: "PUBLIC_SUBMISSION_RECEIVED",
    entity: "PublicSubmission",
    entityId: submission.id,
    req,
    meta: { kind: submission.kind },
  });

  try {
    await sendPublicSubmissionNotification({ submission, data });
  } catch (err) {
    console.error("[public-forms] notification impossible:", err?.message);
  }

  return submission;
}
