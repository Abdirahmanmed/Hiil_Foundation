-- Les coordonnees de paiement du beneficiaire remontent sur la depense, donc
-- AVANT l'approbation. Le Super Admin approuve desormais un beneficiaire ET un
-- compte, et le tresorier recopie au lieu de saisir.
--
-- Nullables : les 3 depenses existantes n'ont evidemment pas ces valeurs, et un
-- paiement en especes n'a pas de compte bancaire.

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "beneficiaryBankName" TEXT,
ADD COLUMN     "beneficiaryAccountRef" TEXT,
ADD COLUMN     "beneficiaryAccountHolder" TEXT;
