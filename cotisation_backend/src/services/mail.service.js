import dns from "node:dns";
import net from "node:net";
import tls from "node:tls";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";

function smtpSecureLabel() {
  return env.EMAIL_SECURE ? "implicit TLS" : "STARTTLS";
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

const transporter = nodemailer.createTransport({
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

export async function sendOtpMail({ email, code }) {
  try {
    const info = await transporter.sendMail({
      from: `Hiil Foundation <${env.EMAIL_USER}>`,
      to: email,
      subject: "Votre code de vérification (OTP)",
      text: `Votre code OTP est : ${code}\nValable ${env.OTP_TTL_MINUTES} minutes.`,
    });

    console.log("✅ OTP email sent:", info.messageId);
    return info;
  } catch (err) {
    logSmtpError("OTP", err);
    throw createEmailDeliveryError("Impossible d’envoyer l’email OTP pour le moment. Réessayez plus tard.");
  }
}

export async function verifyMailer() {
  try {
    await transporter.verify();
    console.log(`✅ SMTP ready (${env.EMAIL_HOST}:${env.EMAIL_PORT}, ${smtpSecureLabel()}, IPv4 forced)`);
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
    "Une dépense Hiil Foundation a été approuvée par le gestionnaire des dépenses.",
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

  try {
    const info = await transporter.sendMail({
      from: `Hiil Foundation <${env.EMAIL_USER}>`,
      to,
      subject: "Token d’approbation de dépense - Hiil Foundation",
      text: lines.join("\n"),
    });
    console.log("✅ Expense approval token email sent:", info.messageId);
    return info;
  } catch (err) {
    logSmtpError("Expense approval token", err);
    throw createEmailDeliveryError("Impossible d’envoyer l’email du token d’approbation pour le moment. Réessayez plus tard.");
  }
}
