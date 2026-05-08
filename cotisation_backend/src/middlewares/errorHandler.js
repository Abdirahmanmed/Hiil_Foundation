import { env } from "../config/env.js";

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  if (env.NODE_ENV !== "production") {
    console.error("❌ ERROR:", err);
  }

  res.status(status).json({
    message: err.message || "Server error",
  });
}
