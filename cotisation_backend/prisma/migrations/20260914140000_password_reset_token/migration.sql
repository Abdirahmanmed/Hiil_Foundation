-- Aucune route de mot de passe oublie n'existait, alors que toute
-- l'infrastructure d'envoi d'email etait deja la. Consequence concrete : un
-- compte interne dont le titulaire perdait son mot de passe n'avait AUCUN
-- recours logiciel.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetTokenHash" TEXT,
ADD COLUMN     "resetTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_resetTokenHash_key" ON "User"("resetTokenHash");
