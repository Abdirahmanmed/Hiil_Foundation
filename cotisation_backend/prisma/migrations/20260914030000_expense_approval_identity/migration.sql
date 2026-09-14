-- Le jeton d'approbation disparait : il etait genere par le serveur a l'instant
-- meme de l'approbation, sans re-authentification, donc il ne prouvait rien que
-- le statut APPROUVER ne prouvait deja. Il circulait par email jusqu'au Super
-- Admin, qui devait le transmettre a la main a la tresorerie — hors application,
-- sans trace de qui avait mandate qui — et si le mail echouait, la depense
-- devenait indecaissable. Il est remplace par une re-authentification par mot de
-- passe au moment d'approuver, cote applicatif.

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "approvalTokenHash",
DROP COLUMN "approvalTokenExpiresAt",
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "rejectedById" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
-- Conserve pour l'audit des ordres emis avant ce changement, plus jamais ecrit.
ALTER TABLE "PaymentOrder" ALTER COLUMN "tokenUsedHash" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
