import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";
import { globalLimiter } from "./middlewares/rateLimit.js";
import { errorHandler } from "./middlewares/errorHandler.js";

// Routes
import authRoutes from "./modules/auth/auth.routes.js";
import otpRoutes from "./modules/otp/otp.routes.js";
import subscriptionRoutes from "./modules/subscriptions/subscriptions.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import expenseRoutes from "./modules/expenses/expenses.routes.js";
import paymentOrderRoutes from "./modules/payment-orders/paymentOrders.routes.js";
import treasuryRoutes from "./modules/treasury/treasury.routes.js";
import cacPaymentRoutes from "./modules/cac-payments/cacPayments.routes.js";
import publicFormRoutes from "./modules/public-forms/publicForms.routes.js";
import kycRoutes from "./modules/kyc/kyc.routes.js";
import bootstrapRoutes from "./modules/bootstrap/bootstrap.routes.js";

export const app = express();

// Render, Vercel et tout reverse proxy presentent leur propre IP a Express.
// Sans cette ligne, req.ip vaut la meme valeur pour TOUS les visiteurs : chaque
// limiteur de debit devient un compteur unique et mondial — 5 candidatures par
// heure pour la planete entiere sur le formulaire public, et un seul visiteur
// suffit a fermer l'inscription pour tout le monde. La colonne `ip` de
// PublicSubmission et les lignes d'audit enregistrent aussi l'IP du proxy.
// Surtout PAS `true` : express-rate-limit leve ERR_ERL_PERMISSIVE_TRUST_PROXY,
// et X-Forwarded-For devient forgeable par le client.
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
// "dev" colore la sortie avec des codes ANSI, illisibles dans les logs d'un
// hebergeur. "combined" est le format standard, filtrable et parsable.
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(globalLimiter);

// fichiers uploadés (local)
// Sensitive user documents must not be exposed as static public files.

// health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// 🔑 ROUTES (LES / MANQUAIENT ICI)
app.use("/api/auth", authRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/payment-orders", paymentOrderRoutes);
app.use("/api/treasury", treasuryRoutes);
app.use("/api/cac-payments", cacPaymentRoutes);
app.use("/api/public", publicFormRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/bootstrap", bootstrapRoutes);

// error handler (TOUJOURS EN DERNIER)
app.use(errorHandler);
