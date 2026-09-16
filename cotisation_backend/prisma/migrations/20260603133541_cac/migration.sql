-- DropIndex
-- IF EXISTS : cette migration a longtemps ete triee AVANT celle qui cree ces
-- index (20260603123000). Le renommage du dossier en 20260603133541 retablit
-- l'ordre, et le IF EXISTS garantit qu'un rejeu reste sans effet sur une base
-- ou la migration a deja ete enregistree sous son ancien nom.
DROP INDEX IF EXISTS "Subscription_cacReference_idx";

-- DropIndex
DROP INDEX IF EXISTS "Subscription_cacStatus_idx";
