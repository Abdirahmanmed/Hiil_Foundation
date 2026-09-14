-- Expense n'avait aucune devise, alors que PaymentOrder en a une stricte.
-- Le controle « montant de l'ordre = montant de la depense » comparait donc
-- des unites potentiellement differentes, et les agregats du tableau de bord
-- additionnaient francs djiboutiens, birrs et dollars en un chiffre qui
-- n'existe pas — celui sur lequel le Super Admin decide d'un decaissement.
--
-- Defaut FRANC : les 3 lignes existantes sont toutes en DJF (verifie).

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'FRANC';

-- Les ordres de paiement deja emis font foi pour les depenses qu'ils couvrent.
UPDATE "Expense" e
SET "currency" = p."currency"
FROM "PaymentOrder" p
WHERE p."expenseId" = e."id" AND p."status" <> 'ANNULE';
