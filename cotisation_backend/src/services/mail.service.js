import dns from "node:dns";
import net from "node:net";
import tls from "node:tls";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const BREVO_TRANSACTIONAL_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";

let smtpTransporter;

function smtpSecureLabel() {
  return env.EMAIL_SECURE ? "implicit TLS" : "STARTTLS";
}

function getSenderEmail() {
  return env.EMAIL_FROM || env.EMAIL_USER;
}

function getSenderLabel() {
  const senderName = env.EMAIL_FROM_NAME || "Hiil Foundation";
  return `${senderName} <${getSenderEmail()}>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function textToHtml(text) {
  return `<p>${escapeHtml(text).replaceAll("\n", "<br>")}</p>`;
}

function normalizeRecipients(to) {
  const recipients = (Array.isArray(to) ? to : [to])
    .map((email) => String(email || "").trim())
    .filter(Boolean)
    .map((email) => ({ email }));

  if (recipients.length === 0) {
    throw createEmailDeliveryError("Aucun destinataire email valide n’a été fourni.");
  }

  return recipients;
}

function logSmtpError(context, err) {
  console.error(`❌ ${context} SMTP email failed`, {
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_SECURE,
    mode: smtpSecureLabel(),
    connectionTimeoutMs: env.EMAIL_CONNECTION_TIMEOUT_MS,
    greetingTimeoutMs: env.EMAIL_GREETING_TIMEOUT_MS,
    socketTimeoutMs: env.EMAIL_SOCKET_TIMEOUT_MS,
    code: err?.code,
    command: err?.command,
    responseCode: err?.responseCode,
    message: err?.message || String(err),
  });
}

function redactSensitiveContent(value) {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveContent);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        if (["htmlContent", "textContent", "params", "attachment"].includes(key)) {
          return [key, "[redacted]"];
        }
        return [key, redactSensitiveContent(entry)];
      }),
    );
  }
  if (typeof value === "string") {
    return value
      .replace(/(token\s*[:=]\s*)[^\s<,"'}]+/gi, "$1[redacted]")
      .replace(/(code\s*otp\s*(?:est)?\s*[:=]?\s*)\d{4,8}/gi, "$1[redacted]");
  }
  return value;
}

function sanitizeBrevoResponseBody(body) {
  if (!body) return body;

  let sanitized = body;
  try {
    const parsed = JSON.parse(body);
    sanitized = JSON.stringify(redactSensitiveContent(parsed));
  } catch {
    sanitized = body
      .replace(/("htmlContent"\s*:\s*")[^"]*(")/gi, "$1[redacted]$2")
      .replace(/("textContent"\s*:\s*")[^"]*(")/gi, "$1[redacted]$2")
      .replace(/(token\s*[:=]\s*)[^\s<,"'}]+/gi, "$1[redacted]")
      .replace(/(code\s*otp\s*(?:est)?\s*[:=]?\s*)\d{4,8}/gi, "$1[redacted]");
  }

  return sanitized.length > 1_000 ? `${sanitized.slice(0, 1_000)}…` : sanitized;
}

function logBrevoApiError(context, status, body) {
  console.error(`❌ ${context} Brevo API email failed`, {
    status,
    responseBody: sanitizeBrevoResponseBody(body),
  });
}

function createEmailDeliveryError(message) {
  const error = new Error(message);
  error.status = 502;
  return error;
}

function lookupIpv4(host) {
  return new Promise((resolve, reject) => {
    dns.lookup(host, { family: 4 }, (err, address) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(address);
    });
  });
}

async function connectSocket({ host, port, secure }) {
  const address = await lookupIpv4(host);

  return new Promise((resolve, reject) => {
    let settled = false;
    const socketOptions = {
      host: address,
      port,
      family: 4,
      servername: host,
      timeout: env.EMAIL_CONNECTION_TIMEOUT_MS,
    };
    const socket = secure ? tls.connect(socketOptions) : net.connect(socketOptions);

    const cleanup = () => {
      socket.removeListener("connect", onConnect);
      socket.removeListener("secureConnect", onSecureConnect);
      socket.removeListener("error", onError);
      socket.removeListener("timeout", onTimeout);
    };
    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(value);
    };
    const onConnect = () => settle(resolve, { connection: socket });
    const onSecureConnect = () => settle(resolve, { connection: socket, secured: true });
    const onError = (err) => {
      socket.destroy();
      settle(reject, err);
    };
    const onTimeout = () => {
      const err = new Error(`SMTP connection timed out after ${env.EMAIL_CONNECTION_TIMEOUT_MS}ms`);
      err.code = "ETIMEDOUT";
      onError(err);
    };

    socket.once(secure ? "secureConnect" : "connect", secure ? onSecureConnect : onConnect);
    socket.once("error", onError);
    socket.once("timeout", onTimeout);
  });
}

function getSmtpTransporter() {
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      secure: env.EMAIL_SECURE,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },

      // Render peut résoudre certains relais SMTP en IPv6 alors que la sortie IPv6
      // n'est pas toujours routable. On fournit donc à Nodemailer une socket déjà
      // ouverte sur une adresse IPv4 explicite, sans dépendre d'un provider précis.
      getSocket: (_options, callback) => {
        connectSocket({ host: env.EMAIL_HOST, port: env.EMAIL_PORT, secure: env.EMAIL_SECURE })
          .then((socketOptions) => callback(null, socketOptions))
          .catch((err) => callback(err));
      },

      connectionTimeout: env.EMAIL_CONNECTION_TIMEOUT_MS,
      greetingTimeout: env.EMAIL_GREETING_TIMEOUT_MS,
      socketTimeout: env.EMAIL_SOCKET_TIMEOUT_MS,
      dnsTimeout: env.EMAIL_CONNECTION_TIMEOUT_MS,

      requireTLS: !env.EMAIL_SECURE,

      tls: {
        servername: env.EMAIL_HOST,
        minVersion: "TLSv1.2",
      },
    });
  }

  return smtpTransporter;
}

async function sendBrevoApiEmail({ to, subject, html, text, context }) {
  let response;
  try {
    response = await fetch(BREVO_TRANSACTIONAL_EMAIL_URL, {
      method: "POST",
      headers: {
        "api-key": env.BREVO_API_KEY,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: env.EMAIL_FROM_NAME || "Hiil Foundation",
          email: env.EMAIL_FROM,
        },
        to,
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });
  } catch (err) {
    logBrevoApiError(context, "network_error", err?.message || String(err));
    throw createEmailDeliveryError("Impossible d’envoyer l’email via Brevo API pour le moment. Réessayez plus tard.");
  }

  const responseBody = await response.text();
  if (!response.ok) {
    logBrevoApiError(context, response.status, responseBody);
    throw createEmailDeliveryError("Impossible d’envoyer l’email via Brevo API pour le moment. Réessayez plus tard.");
  }

  try {
    return responseBody ? JSON.parse(responseBody) : { accepted: to.map((recipient) => recipient.email) };
  } catch {
    return { accepted: to.map((recipient) => recipient.email) };
  }
}

async function sendSmtpEmail({ to, subject, html, text }) {
  return getSmtpTransporter().sendMail({
    from: getSenderLabel(),
    to: to.map((recipient) => recipient.email),
    subject,
    html,
    text,
  });
}

async function sendEmail({ to, subject, html, text, context = "Transactional" }) {
  const recipients = normalizeRecipients(to);
  const textContent = text || "";
  const htmlContent = html || textToHtml(textContent);

  if (env.BREVO_API_KEY) {
    return sendBrevoApiEmail({
      to: recipients,
      subject,
      html: htmlContent,
      text: textContent,
      context,
    });
  }

  try {
    return await sendSmtpEmail({
      to: recipients,
      subject,
      html: htmlContent,
      text: textContent,
    });
  } catch (err) {
    logSmtpError(context, err);
    throw createEmailDeliveryError("Impossible d’envoyer l’email SMTP pour le moment. Réessayez plus tard.");
  }
}

export async function sendOtpMail({ email, code }) {
  const text = `Votre code OTP est : ${code}\nValable ${env.OTP_TTL_MINUTES} minutes.`;
  const html = `<p>Votre code OTP est : <strong>${escapeHtml(code)}</strong></p><p>Valable ${env.OTP_TTL_MINUTES} minutes.</p>`;

  try {
    return await sendEmail({
      to: email,
      subject: "Votre code de vérification (OTP)",
      html,
      text,
      context: "OTP",
    });
  } catch (err) {
    if (err?.status === 502) {
      throw err;
    }
    throw createEmailDeliveryError("Impossible d’envoyer l’email OTP pour le moment. Réessayez plus tard.");
  }
}

export const sendOtpEmail = sendOtpMail;

const SUBMISSION_LABELS = {
  PROJECT_PROPOSAL: "Appel à projets",
  VOLUNTEER: "Candidature bénévole",
};

/**
 * Previent la fondation qu'une candidature vient d'arriver.
 * La candidature est DEJA enregistree en base quand cet email part : si l'envoi
 * echoue, rien n'est perdu.
 */
export async function sendPublicSubmissionNotification({ submission, data }) {
  const label = SUBMISSION_LABELS[submission.kind] || submission.kind;

  const lines = [
    `${label}`,
    ``,
    `Nom     : ${data.fullName}`,
    `Email   : ${data.email}`,
  ];

  if (submission.kind === "PROJECT_PROPOSAL") {
    if (data.organization) lines.push(`Structure : ${data.organization}`);
    if (data.theme) lines.push(`Thématique : ${data.theme}`);
    lines.push(``, `Projet :`, data.message);
  } else {
    if (data.skills) lines.push(`Compétences : ${data.skills}`);
    if (data.availability) lines.push(`Disponibilités : ${data.availability}`);
  }

  lines.push(``, `Référence : ${submission.id}`);

  const text = lines.join("\n");
  const html = lines
    .map((line) => (line ? `<p>${escapeHtml(line)}</p>` : "<br/>"))
    .join("");

  return sendEmail({
    to: env.CONTACT_EMAIL,
    subject: `${label} — ${data.fullName}`,
    html,
    text,
    context: "PublicSubmission",
  });
}

const INTERNAL_ROLE_LABELS = {
  ADMIN: "Administrateur",
  GESTIONNAIRE_DEPENSE: "Gestionnaire de dépense",
  EQUIPE_TRESORERIE: "Équipe trésorerie",
};

/**
 * Invitation d'un compte interne : le titulaire fixe lui-meme son mot de passe.
 * Le lien contient le jeton en clair — il n'existe nulle part ailleurs, seul son
 * hash est conserve en base.
 */
export async function sendInternalInviteMail({ email, fullName, role, token, expiresAt }) {
  const link = `${env.APP_PUBLIC_URL}/activation?token=${encodeURIComponent(token)}`;
  const roleLabel = INTERNAL_ROLE_LABELS[role] || role;
  const deadline = expiresAt.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const text = [
    `Bonjour ${fullName},`,
    ``,
    `Un compte ${roleLabel} vient d'être créé pour vous sur ${env.EMAIL_FROM_NAME}.`,
    `Définissez votre mot de passe avec ce lien :`,
    link,
    ``,
    `Ce lien est valable jusqu'au ${deadline}.`,
    `Personne d'autre que vous ne connaît le mot de passe de ce compte : c'est vous qui le choisissez.`,
    ``,
    `Si vous n'attendiez pas cet email, ignorez-le et prévenez l'administration.`,
  ].join("\n");

  const html = `
    <p>Bonjour ${escapeHtml(fullName)},</p>
    <p>Un compte <strong>${escapeHtml(roleLabel)}</strong> vient d'être créé pour vous sur ${escapeHtml(env.EMAIL_FROM_NAME)}.</p>
    <p><a href="${escapeHtml(link)}">Définir mon mot de passe</a></p>
    <p>Ce lien est valable jusqu'au <strong>${escapeHtml(deadline)}</strong>.</p>
    <p>Personne d'autre que vous ne connaît le mot de passe de ce compte : c'est vous qui le choisissez.</p>
    <p style="color:#666">Si vous n'attendiez pas cet email, ignorez-le et prévenez l'administration.</p>
  `;

  return sendEmail({
    to: email,
    subject: `Activez votre compte ${roleLabel}`,
    html,
    text,
    context: "InternalInvite",
  });
}

export async function verifyMailer() {
  if (env.BREVO_API_KEY) {
    console.log(`Brevo Transactional Email API configured for ${env.EMAIL_FROM}`);
    return;
  }

  try {
    await getSmtpTransporter().verify();
    console.log(`SMTP ready (${env.EMAIL_HOST}:${env.EMAIL_PORT}, ${smtpSecureLabel()}, IPv4 forced)`);
  } catch (err) {
    logSmtpError("SMTP verify", err);
  }
}

/**
 * Prévient l'équipe trésorerie qu'une dépense vient d'être approuvée.
 *
 * Remplace l'email qui transportait un jeton d'approbation jusqu'au Super Admin,
 * à charge pour lui de le retransmettre à la main — hors application, sans trace
 * de qui avait mandaté qui. Celui-ci ne contient aucun secret : il annonce, il
 * n'autorise pas. La dépense est de toute façon déjà visible dans la liste de la
 * trésorerie, donc l'échec de cet envoi ne bloque plus aucun décaissement.
 */
export async function sendExpenseApprovedEmail({ to, expense }) {
  const lines = [
    "Bonjour,",
    "",
    "Une dépense vient d'être approuvée et attend son ordre de paiement.",
    `Libellé : ${expense.label}`,
    `Montant : ${expense.amount}`,
    `Bénéficiaire : ${expense.beneficiaryName}`,
    `Référence : ${expense.id}`,
    "",
    "Elle apparaît dans votre liste des dépenses approuvées.",
  ];

  const html = `
    <p>Bonjour,</p>
    <p>Une dépense vient d'être approuvée et attend son ordre de paiement.</p>
    <ul>
      <li><strong>Libellé :</strong> ${escapeHtml(expense.label)}</li>
      <li><strong>Montant :</strong> ${escapeHtml(expense.amount)}</li>
      <li><strong>Bénéficiaire :</strong> ${escapeHtml(expense.beneficiaryName)}</li>
      <li><strong>Référence :</strong> ${escapeHtml(expense.id)}</li>
    </ul>
    <p>Elle apparaît dans votre liste des dépenses approuvées.</p>
  `;

  return sendEmail({
    to,
    subject: "Dépense approuvée — Hiil Foundation",
    html,
    text: lines.join("\n"),
    context: "ExpenseApproved",
  });
}
