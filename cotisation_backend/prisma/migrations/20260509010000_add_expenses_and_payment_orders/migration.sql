-- Add administrative roles for expenses and treasury workflows
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'GESTIONNAIRE_DEPENSE';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'EQUIPE_TRESORERIE';

-- Reuse the existing PaymentMethod enum and extend it for payment orders
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'VIREMENT_BANCAIRE';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CASH';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CHEQUE';

CREATE TYPE "ExpenseType" AS ENUM ('ALIMENTATION', 'CONSTRUCTION', 'MEDICAMENT');
CREATE TYPE "Country" AS ENUM ('DJIBOUTI', 'ETHIOPIE');
CREATE TYPE "ExpenseStatus" AS ENUM ('EN_ATTENTE', 'APPROUVER', 'EFFECTUER', 'REJETER');
CREATE TYPE "Currency" AS ENUM ('FRANC', 'DOLLAR', 'BIRR_ETHIOPIEN');
CREATE TYPE "PaymentOrderStatus" AS ENUM ('CREE', 'IMPRIME');

CREATE TABLE "Expense" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "type" "ExpenseType" NOT NULL,
  "label" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  "amount" INTEGER NOT NULL,
  "beneficiaryName" TEXT NOT NULL,
  "beneficiaryCountry" "Country" NOT NULL,
  "beneficiaryCity" TEXT NOT NULL,
  "status" "ExpenseStatus" NOT NULL DEFAULT 'EN_ATTENTE',
  "createdById" TEXT NOT NULL,
  "approvedByManagerAt" TIMESTAMP(3),
  "approvalTokenHash" TEXT,
  "approvalTokenExpiresAt" TIMESTAMP(3),
  "superAdminNotifiedAt" TIMESTAMP(3),
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentOrder" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "expenseId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "tokenUsedHash" TEXT NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "currency" "Currency" NOT NULL,
  "paymentCountry" "Country" NOT NULL,
  "amount" INTEGER NOT NULL,
  "referenceNumber" TEXT NOT NULL,
  "status" "PaymentOrderStatus" NOT NULL DEFAULT 'CREE',
  CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentOrder_referenceNumber_key" ON "PaymentOrder"("referenceNumber");
CREATE INDEX "Expense_createdById_createdAt_idx" ON "Expense"("createdById", "createdAt");
CREATE INDEX "Expense_status_createdAt_idx" ON "Expense"("status", "createdAt");
CREATE INDEX "PaymentOrder_expenseId_idx" ON "PaymentOrder"("expenseId");
CREATE INDEX "PaymentOrder_createdById_createdAt_idx" ON "PaymentOrder"("createdById", "createdAt");

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
