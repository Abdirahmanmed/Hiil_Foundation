-- Garde-fou en base, qui protege aussi des scripts et des corrections manuelles :
-- le montant d'une depense vaut sa quantite multipliee par son prix unitaire.
--
-- NOT VALID permet de deployer sans bloquer sur l'historique. Les lignes
-- existantes ne sont pas verifiees, les nouvelles le sont. A VALIDER une fois
-- l'historique arbitre :
--
--   SELECT id, quantity, "unitPrice", amount FROM "Expense"
--   WHERE amount <> quantity * "unitPrice";
--   ALTER TABLE "Expense" VALIDATE CONSTRAINT "Expense_amount_consistent";
--
-- Prisma n'introspecte pas les CHECK : aucune derive de schema.
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_amount_consistent"
  CHECK ("amount" = "quantity" * "unitPrice") NOT VALID;
