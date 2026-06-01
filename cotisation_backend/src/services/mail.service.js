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

export async function sendExpenseApprovalTokenEmail({ to, expense, token }) {
  const expiresAt = expense.approvalTokenExpiresAt
    ? new Date(expense.approvalTokenExpiresAt).toLocaleString("fr-FR")
    : "Non renseignée";
  const lines = [
    "Bonjour,",
    "",
    "Une dépense Hiil Foundation a été approuvée par le Super Admin.",
    `Référence dépense : ${expense.id}`,
    `Libellé : ${expense.label}`,
    `Montant : ${expense.amount}`,
    `Bénéficiaire : ${expense.beneficiaryName}`,
    `Token : ${token}`,
    `Expiration : ${expiresAt}`,
    "",
    "Le SUPER_ADMIN doit transmettre ce token manuellement à l’équipe trésorerie.",
    "Le token n’est pas stocké en clair en base de données.",
  ];

  const html = `
    <p>Bonjour,</p>
    <p>Une dépense Hiil Foundation a été approuvée par le Super Admin.</p>
    <ul>
      <li><strong>Référence dépense :</strong> ${escapeHtml(expense.id)}</li>
      <li><strong>Libellé :</strong> ${escapeHtml(expense.label)}</li>
      <li><strong>Montant :</strong> ${escapeHtml(expense.amount)}</li>
      <li><strong>Bénéficiaire :</strong> ${escapeHtml(expense.beneficiaryName)}</li>
      <li><strong>Token :</strong> ${escapeHtml(token)}</li>
      <li><strong>Expiration :</strong> ${escapeHtml(expiresAt)}</li>
    </ul>
    <p>Le SUPER_ADMIN doit transmettre ce token manuellement à l’équipe trésorerie.</p>
    <p>Le token n’est pas stocké en clair en base de données.</p>
  `;

  try {
    return await sendEmail({
      to,
      subject: "Token d’approbation de dépense - Hiil Foundation",
      html,
      text: lines.join("\n"),
      context: "Expense approval token",
    });
  } catch (err) {
    if (err?.status === 502) {
      throw err;
    }
    throw createEmailDeliveryError("Impossible d’envoyer l’email du token d’approbation pour le moment. Réessayez plus tard.");
  }
}
