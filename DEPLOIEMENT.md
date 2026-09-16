# Déploiement — branche `fix/vague-0-controle-interne`

Procédure à suivre une fois, dans cet ordre, pour mettre cette branche en production.
Chaque étape se termine par un contrôle dont la sortie attendue est indiquée.

---

## 0. Sauvegarder, et vérifier que la sauvegarde est exploitable

```bash
pg_dump --format=custom --no-owner --no-privileges -f hiil-$(date +%F).dump "$DATABASE_URL"
```

Restaure ce dump **une fois** dans une base jetable avant de continuer. Un dump jamais restauré n'est
pas une sauvegarde, c'est une hypothèse.

---

## 1. Variables d'environnement à poser AVANT de déployer

L'API refuse désormais de démarrer en production sans `CAC_PAYMENT_MODE`. C'est volontaire — le mode
`mock` accepte l'OTP constant `123456`, il ne doit jamais s'appliquer par omission — mais si tu
déploies sans la poser, le service redémarre en boucle.

| Variable | Obligatoire | Valeur |
|---|---|---|
| `CAC_PAYMENT_MODE` | **oui, en production** | `mock` tant que le rail CAC n'est pas en service |
| `APP_PUBLIC_URL` | non | URL publique du front, pour les liens d'invitation et de réinitialisation. Défaut : `CORS_ORIGIN` |
| `CONTACT_EMAIL` | non | destinataire interne des candidatures. Défaut : `EMAIL_FROM` |
| `CLOUDINARY_URL` | **oui, en production** | chaîne unique du tableau de bord Cloudinary (*Account Details → API environment variable*). Sans elle, l'API refuse de démarrer |
| `UPLOAD_ROOT` | non | aire de transit locale avant l'envoi chez Cloudinary. Ne sert plus de stockage durable |
| `PRISMA_LOG_QUERIES` | non | `true` pour journaliser le SQL. Écrit les paramètres en clair : jamais en production |

En mode `live`, les six variables `CAC_*` sont exigées au démarrage.

Le fichier [`cotisation_backend/.env.example`](cotisation_backend/.env.example) liste toutes les
variables, avec pour chacune si elle est requise et ce qui se passe sans elle.

---

## 2. Déployer le code, puis appliquer les migrations

Rien à faire sur `_prisma_migrations` **avant** le déploiement : `prisma migrate deploy` s'applique
tel quel sur la base actuelle. Les `DROP INDEX` de `20260603133541_cac` sont en `IF EXISTS`, donc
leur rejeu est sans effet.

```bash
npx prisma migrate deploy
```

Attendu : toutes les migrations `20260603133541_cac` et `202609140*` appliquées,
`All migrations have been successfully applied`.

> **Une seule migration peut échouer, et c'est volontaire.**
> `20260914050000_payment_order_lifecycle` pose un index UNIQUE sur l'ordre de paiement *actif* d'une
> dépense. Si deux ordres actifs existent pour une même dépense, la migration s'arrête. C'est le
> comportement voulu : deux bons imprimés pour une même dépense sont un incident de paiement, il se
> tranche avec la trésorerie avant de migrer, pas après. Vérifié au moment de l'écriture : **0 ordre
> de paiement en production**, donc aucun doublon possible. Pour le contrôler quand même :
>
> ```sql
> SELECT "expenseId", count(*), array_agg("referenceNumber"), array_agg(status)
> FROM "PaymentOrder" GROUP BY 1 HAVING count(*) > 1;
> ```
>
> Ne supprime rien automatiquement si cette requête renvoie des lignes.

> Le backend n'applique **pas** les migrations tout seul au démarrage : il n'y a ni `postinstall`, ni
> `prestart`, ni `release command`. Si tu déploies le code sans lancer cette commande, la création
> d'un compte interne échoue sur `The column inviteTokenHash does not exist`.

---

## 3. Nettoyer l'historique des migrations

Trois `UPDATE` et un `DELETE`, à lancer **après** le déploiement.

Les trois `UPDATE` réalignent des checksums qui vont changer à cause du `.gitattributes` ajouté :
ces trois fichiers étaient en CRLF sur le poste Windows au moment de leur application, et repassent
en LF au prochain checkout. `prisma migrate deploy` tolère cet écart, **`prisma migrate dev` non** :
il réclamera un reset de la base. Les valeurs ci-dessous ont été recalculées sur la variante LF des
fichiers et comparées à ce que contient la base.

Le `DELETE` retire la ligne orpheline laissée par le renommage du dossier `20260603103541_cac` en
`20260603133541_cac`. À ce stade la nouvelle ligne existe avec son bon checksum ; l'ancienne ne sert
plus à rien et fait apparaître une divergence d'historique à chaque `migrate status`.

```sql
UPDATE _prisma_migrations SET checksum = '2563387504b972d08c5d594436b669da5f5fabd260452273a93c425a0ff90635'
  WHERE migration_name = '20260508000000_add_association_representative_fields';
UPDATE _prisma_migrations SET checksum = '55158d7e15cce80c571e9f8865f08f0e228cc74f7266cba95fa21d56e1b99de8'
  WHERE migration_name = '20260509000000_replace_association_status_with_doc';
UPDATE _prisma_migrations SET checksum = 'b111c99d4af53bc730fa621bec576ea4dcd4695352b5cb5bbcdc70723473565f'
  WHERE migration_name = '20260509010000_add_expenses_and_payment_orders';

DELETE FROM _prisma_migrations WHERE migration_name = '20260603103541_cac';
```

**N'utilise pas `prisma migrate resolve --applied` ici** : cette commande *insère* une ligne, elle ne
renomme rien et refuse un nom déjà enregistré.

Contrôle :

```bash
npx prisma migrate status
```

Attendu : `Database schema is up to date!`, sans mention de migration absente localement.

---

## 3 bis. Ce que la reprise de données va changer sous tes yeux

Le backfill des encaissements (`20260914110000_contribution_backfill`) reprend **une seule ligne** :
la cotisation de 6 000 DJF marquée payée. Sa référence est `MOCK-CAC-1789389163` — c'est un test en
mode mock, pas de l'argent reçu. Elle est reprise pour ne pas perdre la trace ; supprime-la si elle
fausse tes chiffres :

```sql
DELETE FROM "Contribution" WHERE reference LIKE 'MOCK-%';
```

Le tableau de bord affiche maintenant **« Engagé »** et **« Encaissé »** séparément. Le second sera
beaucoup plus bas que le chiffre unique d'avant, et c'est normal : l'ancien additionnait des mandats
signés comme s'il s'agissait de recettes. **Préviens le président avant qu'il ne le découvre.**

La contrainte de cohérence des montants est posée en `NOT VALID`, donc sans blocage au déploiement.
Vérifié : les 3 dépenses existantes la respectent déjà, tu peux la valider quand tu veux :

```sql
ALTER TABLE "Expense" VALIDATE CONSTRAINT "Expense_amount_consistent";
```

---

## 4. Faire changer les mots de passe des comptes internes existants

Les comptes internes créés avant cette version ont un mot de passe **choisi par la personne qui les a
créés**. Le nouveau parcours d'invitation ne s'applique qu'aux comptes créés à partir de maintenant :
il ne répare pas l'existant. Tant que ces mots de passe ne sont pas changés par leurs titulaires, la
séparation des pouvoirs reste contournable sur ces comptes-là.

`scripts/seed.js` ne crée plus qu'**un** compte, celui d'amorçage, au lieu de quatre. Ne l'utilise
que sur un environnement neuf, et change son mot de passe dès la première connexion.

---

## 4 bis. Le renommage SUPER_ADMIN → OUGAS_ADMIN

La migration `20260916000000_ougas_admin_role` renomme la valeur d'enum : **le Super Admin
actuellement en production devient l'Ougas Admin, sans perdre un seul pouvoir.** Il continue
d'approuver les dépenses, de forcer un consentement et de modifier les rôles. Il se connecte au même
endroit ; seule l'URL de son tableau de bord change, de `/super-admin` à `/ougas-admin`, et la
redirection après connexion suit toute seule.

Le nom `SUPER_ADMIN` est ensuite réutilisé pour un rôle **neuf et vide** : le compte d'amorçage, dont
l'unique pouvoir est de créer un Ougas Admin. Aucune ligne ne le porte après la migration — c'est le
seed qui le crée.

À vérifier **après** `prisma migrate deploy` :

```sql
-- L'ancien Super Admin est bien devenu Ougas Admin, et il est toujours ACTIVE.
SELECT email, role, status FROM "User" WHERE role IN ('OUGAS_ADMIN','SUPER_ADMIN');
-- attendu : une ligne OUGAS_ADMIN, aucune ligne SUPER_ADMIN
```

Puis créer le compte d'amorçage, avec une adresse et un téléphone **qui ne servent à rien d'autre** :

```bash
SEED_BOOTSTRAP_EMAIL=... SEED_BOOTSTRAP_PASSWORD=... node scripts/seed.js
```

Le seed refuse de toucher à un compte existant. Si tu réutilises l'adresse de l'ancien Super Admin,
il s'arrête avec un message plutôt que de retirer à l'Ougas Admin son pouvoir d'approbation.

---

## 4 ter. Cloudinary pour les pièces d'identité

`CLOUDINARY_URL` est désormais **obligatoire en production** : sans elle l'API refuse de démarrer,
volontairement. Le disque de Render est éphémère — les documents déposés y disparaissaient au
redéploiement suivant, en laissant en base des lignes pointant vers rien.

Ce qui change concrètement :

- les documents partent chez Cloudinary **après** la vérification des magic bytes, jamais avant ;
- ils sont déposés en `type: authenticated` et `resource_type: raw` : pas d'URL publique, pas de
  transformation, les octets exacts reviennent ;
- l'URL signée ne quitte jamais le serveur. `GET /api/kyc/:userId/:docType` va chercher le fichier et
  le retransmet lui-même, ce qui garde le contrôle de rôle et la ligne d'audit à chaque consultation.

**Les documents déposés avant ce déploiement restent lisibles s'ils existent encore** : la clé locale
est reconnue et servie comme avant. En pratique, sur Render, ils ont déjà disparu — la route répond
alors `410` avec un message explicite, et il faut demander à l'adhérent de redéposer sa pièce.

À vérifier une fois en ligne, avec une vraie inscription :

```sql
-- Les nouvelles clés commencent par « cloudinary| », les anciennes non.
SELECT id, left("idDocPath", 40) AS cle FROM "User"
WHERE "idDocPath" IS NOT NULL ORDER BY "createdAt" DESC LIMIT 5;
```

Puis ouvrir le document depuis l'écran Adhérents. S'il s'affiche, la chaîne complète fonctionne :
dépôt signé, URL signée, retransmission, audit. **C'est le seul point que je n'ai pas pu vérifier
sans tes identifiants Cloudinary** — la signature d'URL est testée, la livraison réelle non.

---

## 5. Contrôle de bout en bout

```bash
API=https://<ton-api>

# 1. l'API répond
curl -s -o /dev/null -w '%{http_code}\n' "$API/api/health"          # 200

# 2. le rate-limit compte par IP et non globalement (trust proxy)
curl -sS -D- -o /dev/null "$API/api/health" | grep -i ratelimit      # ratelimit-remaining élevé

# 3. le formulaire public écrit vraiment
curl -s -X POST "$API/api/public/submissions" \
  -H 'content-type: application/json' \
  -d '{"kind":"VOLUNTEER","fullName":"Test Controle","email":"test@exemple.dj"}'
# {"message":"Candidature reçue.","submissionId":"..."}
```

Puis en base : `SELECT count(*) FROM "PublicSubmission";` doit avoir augmenté de 1. Supprime la ligne
de test ensuite.

Enfin, dans un navigateur : crée un compte interne depuis `/admin`, vérifie que le formulaire ne
demande **aucun mot de passe**, que la ligne apparaît en `PENDING_VERIFICATION` avec un bouton
« Renvoyer l'invitation » à la place du sélecteur de statut, et que le lien reçu par email ouvre
`/activation` et permet de choisir un mot de passe.

---

## Rollback

Le code se rollback par `git revert` des trois commits. **Les migrations ne se rollback pas** :
`prisma migrate deploy` est unidirectionnel. Les colonnes ajoutées (`inviteTokenHash`,
`inviteTokenExpiresAt`) et la table `PublicSubmission` sont additives et nullables, donc l'ancien code
fonctionne avec le nouveau schéma — sauf la création d'un compte interne, qui échouera puisque
l'ancien code envoie un mot de passe que le nouveau schéma zod refuse. En cas de rollback, restaure le
dump de l'étape 0.
