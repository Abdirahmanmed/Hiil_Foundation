-- Fichier 2 sur 3 : la table et la colonne d'echeance.

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "nextDueDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "status" "ContributionStatus" NOT NULL DEFAULT 'PENDING',
    "channel" "ContributionChannel" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "reference" TEXT,
    "rawResponse" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contribution_idempotencyKey_key" ON "Contribution"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Contribution_subscriptionId_periodStart_idx" ON "Contribution"("subscriptionId", "periodStart");

-- CreateIndex
CREATE INDEX "Contribution_status_createdAt_idx" ON "Contribution"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
