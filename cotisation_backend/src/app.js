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

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

app.use(globalLimiter);

// fichiers uploadés (local)
app.use("/api/uploads", express.static("uploads"));

// health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// 🔑 ROUTES (LES / MANQUAIENT ICI)
app.use("/api/auth", authRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin", adminRoutes);

// error handler (TOUJOURS EN DERNIER)
app.use(errorHandler);
