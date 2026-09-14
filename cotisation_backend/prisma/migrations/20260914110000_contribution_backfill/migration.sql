-- Fichier 3 sur 3 : reprise des encaissements deja enregistres.
--
-- Chaque cotisation portant un paidAt devient UNE Contribution confirmee.
-- Verifie sur la base de production au moment de l'ecriture : une seule ligne
-- concernee, un paiement CAC de 6 000 DJF.
--
-- ⚠️ Cette ligne porte la reference 'MOCK-CAC-1789389163' : c'est un paiement
-- de TEST realise en mode mock, pas de l'argent recu. Elle est reprise pour ne
-- pas perdre la trace, et sa reference la rend identifiable. Supprime-la apres
-- deploiement si elle fausse tes chiffres :
--   DELETE FROM "Contribution" WHERE reference LIKE 'MOCK-%';

INSERT INTO "Contribution" (
  "id", "subscriptionId", "amount", "currency", "periodStart",
  "status", "channel", "idempotencyKey", "reference", "rawResponse",
  "paidAt", "createdAt", "updatedAt"
)
SELECT
  'bf_' || s."id",
  s."id",
  s."amount",
  s."currency",
  date_trunc('day', s."paidAt"),
  'CONFIRMED'::"ContributionStatus",
  CASE WHEN s."cacReference" IS NOT NULL THEN 'CAC'::"ContributionChannel"
       WHEN s."paymentMethod" = 'WALLET' THEN 'WALLET'::"ContributionChannel"
       ELSE 'MANUAL'::"ContributionChannel" END,
  'BACKFILL-' || s."id",
  s."cacReference",
  s."cacRawResponse",
  s."paidAt",
  s."paidAt",
  now()
FROM "Subscription" s
WHERE s."paidAt" IS NOT NULL;

-- La prochaine echeance decoule du dernier encaissement et de la periodicite.
-- Calcule ici une fois ; ensuite c'est le service qui l'avance a chaque
-- encaissement confirme.
UPDATE "Subscription" s
SET "nextDueDate" = s."paidAt" + (
  CASE s."frequency"
    WHEN 'MONTHLY'    THEN INTERVAL '1 month'
    WHEN 'QUARTERLY'  THEN INTERVAL '3 months'
    WHEN 'SEMIANNUAL' THEN INTERVAL '6 months'
    WHEN 'ANNUAL'     THEN INTERVAL '1 year'
  END
)
WHERE s."paidAt" IS NOT NULL;
