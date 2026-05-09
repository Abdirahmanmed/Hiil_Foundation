import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,                 // smtp.gmail.com
  port: Number(env.EMAIL_PORT || 587),  // 587
  secure: false,                        // 587 => STARTTLS
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },

  // ✅ Evite blocage infini (Render)
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,

  // ✅ Force STARTTLS (souvent utile sur hébergeurs)
  requireTLS: true,

  // ✅ Parfois nécessaire sur infra cloud
  tls: {
    rejectUnauthorized: false,
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
    console.error("❌ OTP email failed:", err?.message || err);
    throw err;
  }
}

// ✅ Optionnel: test SMTP au démarrage (très utile)
export async function verifyMailer() {
  try {
    await transporter.verify();
    console.log("✅ SMTP ready");
  } catch (e) {
    console.error("❌ SMTP verify failed:", e?.message || e);
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
    console.error("❌ Expense approval token email failed:", err?.message || err);
    throw err;
  }
}
