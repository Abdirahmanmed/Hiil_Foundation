-- Fichier separe, et c'est obligatoire : PostgreSQL interdit d'UTILISER une
-- valeur d'enum dans la transaction qui l'ajoute, et Prisma execute chaque
-- fichier de migration dans une transaction. Le backfill de la migration
-- suivante lit ces valeurs, il ne peut donc pas vivre ici.

-- AlterEnum
ALTER TYPE "PaymentOrderStatus" ADD VALUE IF NOT EXISTS 'EXECUTE';

-- AlterEnum
ALTER TYPE "PaymentOrderStatus" ADD VALUE IF NOT EXISTS 'ANNULE';
