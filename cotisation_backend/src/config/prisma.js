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
  // Le mode "query" ecrit CHAQUE requete SQL avec ses parametres en clair —
  // donc des emails, des telephones, des montants. Il etait actif des que
  // NODE_ENV valait "development", c'est-a-dire aussi quand la variable etait
  // simplement absente. Desormais c'est un opt-in explicite.
  log:
    process.env.PRISMA_LOG_QUERIES === "true"
      ? ["query", "warn", "error"]
      : ["warn", "error"],
});

export default prisma;
