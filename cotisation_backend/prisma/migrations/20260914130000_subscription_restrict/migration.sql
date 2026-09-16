-- Supprimer un membre effacait ses cotisations en cascade — donc ses
-- encaissements, ses dates de paiement et ses references bancaires. Une trace
-- financiere ne doit pas disparaitre parce qu'un compte disparait.
--
-- Aucune route ne supprime d'utilisateur aujourd'hui : ce changement est
-- preventif. Un droit a l'effacement se traitera par anonymisation du membre.

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
