# Hiil Foundation — cotisations

Back-office financier d'une fondation caritative djiboutienne. Il collecte de l'argent auprès de
membres — particuliers et associations — et le redépense sur le terrain au profit de bénéficiaires
nommés à Djibouti et en Éthiopie.

**Le vrai problème que ce logiciel résout n'est pas le paiement, c'est le contrôle interne.**
Celui qui engage une dépense ne l'approuve pas, celui qui l'approuve ne la décaisse pas, celui qui
supervise ne décide pas. Toute évolution qui affaiblit cette séparation est à refuser, même
pratique.

---

## Les rôles

| Rôle | Ce qu'il fait | Ce qu'il ne peut jamais faire |
|---|---|---|
| `CLIENT` | Cotise. Déclare un mandat, signe le consentement, paie | Rien du back-office |
| `GESTIONNAIRE_DEPENSE` | **Engage** une dépense | L'approuver, la décaisser |
| `OUGAS_ADMIN` | **Approuve** ou rejette, avec son mot de passe | Engager, décaisser |
| `EQUIPE_TRESORERIE` | **Décaisse** : émet, imprime, exécute, annule un ordre | Engager, approuver |
| `ADMIN` | **Supervise** : lit tout, crée les comptes internes, suspend | Approuver, décaisser |
| `SUPER_ADMIN` | **Amorce** : crée un `OUGAS_ADMIN`, et rien d'autre | Lire un montant, un membre, une cotisation |

Les deux derniers ne sont pas deux niveaux du même pouvoir. L'`OUGAS_ADMIN` est l'autorité métier :
lui seul valide l'argent versé aux bénéficiaires. Le `SUPER_ADMIN` est le compte d'amorçage, détenu
par l'exploitant du logiciel ; il existe pour qu'on puisse nommer un Ougas Admin sans ouvrir un
terminal — et pour cette raison précise, il ne doit rien pouvoir approuver lui-même.

La chaîne de création va dans un seul sens, et chaque compte choisit son propre mot de passe :

```
scripts/seed.js  →  SUPER_ADMIN  →  OUGAS_ADMIN  →  ADMIN  →  GESTIONNAIRE_DEPENSE
                                                           →  EQUIPE_TRESORERIE
```

La matrice vit dans un seul fichier, [`cotisation_backend/src/config/roles.js`](cotisation_backend/src/config/roles.js).
C'est le seul endroit à relire pour auditer la séparation des pouvoirs. Les invariants se vérifient
en deux commandes :

```bash
grep -nE '^export const CAN_(ENGAGE|APPROVE|DISBURSE)' src/config/roles.js | grep -w ADMIN
# doit ne rien renvoyer — le -w est indispensable, sans lui ADMIN matche SUPER_ADMIN

grep -nw SUPER_ADMIN src/config/roles.js
# ne doit apparaître que dans CAN_BOOTSTRAP — vérifié aussi par tests/roles.test.js
```

---

## Démarrer

```bash
# Backend
cd cotisation_backend
cp .env.example .env          # puis remplir
npm ci                        # JAMAIS --omit=dev : la CLI prisma est en devOptional
npx prisma generate           # obligatoire après chaque npm ci
npx prisma migrate deploy
npm run dev

# Frontend
cd ../cotisation
echo "VITE_API_URL=http://localhost:4000" > .env
npm ci
npm run dev
```

Tests : `npm test` dans `cotisation_backend`. Les tests sans base tournent toujours ; ceux qui
touchent la base attendent `TEST_DATABASE_URL`, dont la valeur **doit contenir « test »** — le
garde-fou refuse de démarrer autrement.

Le déploiement a sa propre procédure : [DEPLOIEMENT.md](DEPLOIEMENT.md).

---

## Les règles métier non évidentes

Ce sont celles qu'un repreneur casserait en premier en croyant bien faire.

**`Subscription` est un engagement, pas de l'argent.** Une cotisation `ACTIVE` signifie qu'un mandat
a été signé, pas qu'un versement a été reçu. L'argent vit dans `Contribution`, une ligne par
versement. Ne jamais sommer des `Subscription.amount` pour obtenir une recette.

**`Frequency` n'est interprété par aucune tâche planifiée.** Il n'y a ni échéancier généré, ni cron,
ni service supplémentaire. `nextDueDate` est avancé à chaque encaissement confirmé, et le retard est
un calcul à la lecture. C'est volontaire.

**Le montant d'une dépense est dérivé, jamais saisi** : `quantity × unitPrice`, recalculé côté
serveur, avec une contrainte `CHECK` en base. Un champ éditable permettait de déclarer 10 sacs à
1 000 et de faire approuver 500 000.

**L'approbation d'une dépense demande le mot de passe de l'Ougas Admin.** C'est le second facteur ; il
a remplacé un jeton qui n'en était pas un — le serveur le générait à l'instant même de
l'approbation, sans réauthentifier personne, et il circulait par email hors de l'application.

**Un seul ordre de paiement actif par dépense**, garanti par un index UNIQUE sur une colonne
nullable (`activeExpenseId`) : Postgres autorise plusieurs `NULL`, donc la réémission après
annulation reste possible. Annuler est borné par état et par rôle — un ordre imprimé n'est annulable
que par l'Ougas Admin, un ordre exécuté jamais.

**`EFFECTUER` ≠ payé.** Une dépense bascule en `EFFECTUER` quand l'ordre est créé ; l'argent ne
quitte la banque qu'au statut `EXECUTE`, avec sa date réelle. « Engagé » et « réellement payé » sont
deux chiffres distincts.

**Le créateur d'un compte interne n'en connaît jamais le mot de passe.** Le titulaire le fixe via un
lien d'invitation envoyé à sa propre adresse. Sans cette règle, un ADMIN qui crée le dépensier *et*
le trésorier détient deux pouvoirs sur trois.

**`CAC_PAYMENT_MODE=mock` accepte l'OTP constant `123456`.** C'est pour ça que la valeur est
obligatoire en production : un oubli de variable transformerait silencieusement l'encaissement réel
en simulation.

**Les documents d'identité ne sont jamais servis en statique.** Ils vivent chez Cloudinary en
`type: authenticated` — donc sans URL publique — et passent par `/api/kyc/...`, route authentifiée,
réservée à la supervision, avec contrôle anti-traversée de chemin sur les clés locales héritées. Le
serveur va chercher les octets avec une URL signée qui ne quitte jamais la machine, puis les
retransmet : **chaque consultation est journalisée**, et aucun lien ne peut circuler par copier-coller.

**L'audit ne doit jamais casser une requête métier, mais il doit crier.** Un `catch` vide arrêtait la
piste d'audit en silence pendant que tout le monde croyait qu'elle tournait.

---

## Ce qui reste ouvert

- **Rien ne limite le nombre d'Ougas Admin.** Le compte d'amorçage peut en nommer autant qu'il veut,
  et chacun approuve seul. Le garde-fou est l'audit, pas la technique.
- **Aucun plafond d'engagement** : 50 000 DJF et 50 000 000 DJF suivent le même circuit avec un seul
  approbateur.
- **`scripts/seed.js`** crée quatre comptes dont l'opérateur connaît les mots de passe. Il n'est fait
  que pour amorcer un environnement neuf.
- **Les codes de retour de CAC Bank** doivent être confirmés par écrit avant tout passage en `live`,
  avec la durée de validité de l'OTP et le comportement sur un `vender_ref` rejoué.
- **Les documents déposés avant le passage à Cloudinary** ont disparu avec le disque éphémère de
  Render. Leur ligne existe toujours en base ; la route répond `410` et il faut les redemander.
