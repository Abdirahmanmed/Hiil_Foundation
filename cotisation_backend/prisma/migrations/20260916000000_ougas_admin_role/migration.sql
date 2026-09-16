-- Le SUPER_ADMIN cumulait deux metiers : valider l'argent verse aux
-- beneficiaires, et servir de compte racine. On les separe en deux roles.

-- RENAME VALUE deplace TOUTES les lignes existantes d'un seul coup, sans UPDATE
-- et sans fenetre pendant laquelle un compte n'aurait aucun role : le Super
-- Admin actuellement en production devient l'Ougas Admin, pouvoirs intacts.
ALTER TYPE "Role" RENAME VALUE 'SUPER_ADMIN' TO 'OUGAS_ADMIN';

-- Puis SUPER_ADMIN renait, et aucune ligne ne le porte. C'est desormais le
-- compte d'amorcage, dont l'unique pouvoir est de creer un OUGAS_ADMIN.
--
-- Rien dans CE fichier ne doit inserer ni comparer cette valeur : Postgres
-- refuse d'employer une valeur d'enum ajoutee dans la meme transaction, et
-- prisma migrate deploy enveloppe chaque migration dans une transaction.
-- Le compte d'amorcage se cree donc apres, par scripts/seed.js.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
