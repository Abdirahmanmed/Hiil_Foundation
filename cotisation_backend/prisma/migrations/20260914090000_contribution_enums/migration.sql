-- Fichier 1 sur 3.
-- Les enums seuls : PostgreSQL interdit d'UTILISER une valeur d'enum dans la
-- transaction qui la cree, et Prisma execute chaque fichier dans une
-- transaction. Le backfill du fichier 3 lit ces valeurs.

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "ContributionChannel" AS ENUM ('CAC', 'WALLET', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'MANUAL');
