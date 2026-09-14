-- AlterTable
ALTER TABLE "PaymentOrder" ADD COLUMN     "activeExpenseId" TEXT,
ADD COLUMN     "executedAt" TIMESTAMP(3),
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledById" TEXT,
ADD COLUMN     "cancellationReason" TEXT;

-- Backfill : tout ordre existant est actif, aucun n'a encore pu etre annule.
-- Verifie avant ecriture de cette migration : 0 ordre en production, donc
-- aucun doublon possible. Si des doublons existaient sur un autre
-- environnement, la creation de l'index unique ci-dessous echouerait — et
-- c'est le comportement voulu : deux ordres imprimes pour une meme depense
-- sont un incident de paiement, ils se tranchent avec la tresorerie avant de
-- migrer, pas apres.
UPDATE "PaymentOrder" SET "activeExpenseId" = "expenseId" WHERE "status" <> 'ANNULE';

-- CreateIndex
-- PostgreSQL autorise plusieurs NULL dans un index UNIQUE : un seul ordre
-- ACTIF par depense, et la reemission apres annulation reste possible.
CREATE UNIQUE INDEX "PaymentOrder_activeExpenseId_key" ON "PaymentOrder"("activeExpenseId");

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
