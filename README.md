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
| `SUPER_ADMIN` | **Approuve** ou rejette, avec son mot de passe | Engager, décaisser |
| `EQUIPE_TRESORERIE` | **Décaisse** : émet, imprime, exécute, annule un ordre | Engager, approuver |
| `ADMIN` | **Supervise** : lit tout, crée les comptes internes, suspend | Approuver, décaisser |

La matrice vit dans un seul fichier, [`cotisation_backend/src/config/roles.js`](cotisation_backend/src/config/roles.js).
C'est le seul endroit à relire pour auditer la séparation des pouvoirs. L'invariant se vérifie en
une commande :

```bash
grep -nE '^export const CAN_(ENGAGE|APPROVE|DISBURSE)' src/config/roles.js | grep -w ADMIN
# doit ne rien renvoyer — le -w est indispensable, sans lui ADMIN matche SUPER_ADMIN
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

**L'approbation d'une dépense demande le mot de passe du Super Admin.** C'est le second facteur ; il
a remplacé un jeton qui n'en était pas un — le serveur le générait à l'instant même de
l'approbation, sans réauthentifier personne, et il circulait par email hors de l'application.

**Un seul ordre de paiement actif par dépense**, garanti par un index UNIQUE sur une colonne
nullable (`activeExpenseId`) : Postgres autorise plusieurs `NULL`, donc la réémission après
annulation reste possible. Annuler est borné par état et par rôle — un ordre imprimé n'est annulable
que par le Super Admin, un ordre exécuté jamais.

**`EFFECTUER` ≠ payé.** Une dépense bascule en `EFFECTUER` quand l'ordre est créé ; l'argent ne
quitte la banque qu'au statut `EXECUTE`, avec sa date réelle. « Engagé » et « réellement payé » sont
deux chiffres distincts.

**Le créateur d'un compte interne n'en connaît jamais le mot de passe.** Le titulaire le fixe via un
lien d'invitation envoyé à sa propre adresse. Sans cette règle, un ADMIN qui crée le dépensier *et*
le trésorier détient deux pouvoirs sur trois.

**`CAC_PAYMENT_MODE=mock` accepte l'OTP constant `123456`.** C'est pour ça que la valeur est
obligatoire en production : un oubli de variable transformerait silencieusement l'encaissement réel
en simulation.

**Les documents d'identité ne sont jamais servis en statique.** Ils passent par `/api/kyc/...`,
route authentifiée, réservée à la supervision, avec contrôle anti-traversée de chemin, et **chaque
consultation est journalisée**.

**L'audit ne doit jamais casser une requête métier, mais il doit crier.** Un `catch` vide arrêtait la
piste d'audit en silence pendant que tout le monde croyait qu'elle tournait.

---

## Ce qui reste ouvert

- **Le SUPER_ADMIN est seul approbateur** et ne peut pas être créé depuis l'interface. S'il perd son
  accès, plus aucune dépense n'est approuvable. Il faut un second compte détenu par une autre
  personne.
- **Aucun plafond d'engagement** : 50 000 DJF et 50 000 000 DJF suivent le même circuit avec un seul
  approbateur.
- **`scripts/seed.js`** crée quatre comptes dont l'opérateur connaît les mots de passe. Il n'est fait
  que pour amorcer un environnement neuf.
- **Les codes de retour de CAC Bank** doivent être confirmés par écrit avant tout passage en `live`,
  avec la durée de validité de l'OTP et le comportement sur un `vender_ref` rejoué.
- **Le stockage des documents** doit pointer vers un disque persistant (`UPLOAD_ROOT`). Sur un
  système de fichiers éphémère, ils disparaissent à chaque redéploiement.
