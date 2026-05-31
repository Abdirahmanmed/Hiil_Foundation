import { env } from "../config/env.js";

export function errorHandler(err, req, res, next) {
  if (err?.name === "ZodError" || Array.isArray(err?.issues)) {
    return res.status(400).json({
      message: "Données invalides",
      errors: err.issues || [],
    });
  }

  const status = err.status || 500;

  if (env.NODE_ENV !== "production") {
    console.error("❌ ERROR:", err);
  }

  res.status(status).json({
    message: err.message || "Server error",
  });
}
