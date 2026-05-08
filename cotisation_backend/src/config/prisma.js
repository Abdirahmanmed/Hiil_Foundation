import pkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const { PrismaClient } = pkg;
const { Pool } = pg;

// Pool PostgreSQL (Neon compatible)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production",
});

// Prisma adapter
const adapter = new PrismaPg(pool);

// Prisma Client
const prisma = new PrismaClient({
  adapter,
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "warn", "error"]
      : ["error"],
});

export default prisma;
