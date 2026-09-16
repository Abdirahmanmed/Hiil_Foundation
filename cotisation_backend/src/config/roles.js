/**
 * La matrice des pouvoirs, en un fichier.
 *
 * Avant, la reponse a « qui a le droit de decaisser ? » etait eparpillee entre
 * les requireRole des routes, un assertSuperAdminRole dans expenses.service.js,
 * deux assertions dans admin.service.js et une comparaison de chaine en dur dans
 * le calcul du tableau de bord. Ce fichier est desormais le seul endroit ou lire
 * — et le seul a modifier — pour auditer la separation des pouvoirs.
 *
 * La regle que ce fichier fait respecter :
 *   celui qui engage n'approuve pas, celui qui approuve ne decaisse pas,
 *   celui qui supervise ne decide pas, et celui qui distribue les acces
 *   ne touche a rien d'autre.
 *
 * Deux controles, a passer avant toute relecture :
 *
 *   1. aucun des trois groupes de decision ne contient ADMIN
 *      grep -nE '^export const CAN_(ENGAGE|APPROVE|DISBURSE)' src/config/roles.js | grep -w ADMIN
 *      (le -w est indispensable : sans lui, ADMIN matche aussi SUPER_ADMIN)
 *
 *   2. SUPER_ADMIN n'apparait nulle part ailleurs que dans CAN_BOOTSTRAP
 *      grep -nw SUPER_ADMIN src/config/roles.js
 *
 * Le second controle est verrouille par tests/roles.test.js, qui echoue si un
 * jour quelqu'un glisse le compte d'amorcage dans un groupe metier.
 */

/** Creer une depense. Le terrain engage, et rien d'autre. */
export const CAN_ENGAGE = ["GESTIONNAIRE_DEPENSE"];

/** Approuver ou rejeter une depense. Une seule autorite : l'Ougas Admin. */
export const CAN_APPROVE = ["OUGAS_ADMIN"];

/** Emettre, annuler ou executer un ordre de paiement. */
export const CAN_DISBURSE = ["EQUIPE_TRESORERIE"];

/** Lire les depenses et les ordres. Le perimetre exact depend du role, voir expenseScopeFor(). */
export const CAN_READ_MONEY = [
  "GESTIONNAIRE_DEPENSE",
  "EQUIPE_TRESORERIE",
  "OUGAS_ADMIN",
  "ADMIN",
];

/** Lecture transverse et journal d'audit. Superviser n'est pas decider. */
export const CAN_SUPERVISE = ["ADMIN", "OUGAS_ADMIN"];

/** Position de caisse consolidee. */
export const CAN_SEE_CASH = ["EQUIPE_TRESORERIE", "OUGAS_ADMIN"];

/**
 * Creer un OUGAS_ADMIN, et absolument rien d'autre.
 *
 * L'autorite qui approuve l'argent doit pouvoir etre recreee sans ouvrir un
 * terminal : sans ce role, perdre l'unique Ougas Admin bloquait toute depense
 * jusqu'a une intervention manuelle en base. Mais le compte capable de nommer
 * l'approbateur ne doit surtout pas pouvoir approuver lui-meme, ni voir un
 * montant, ni toucher aux comptes des membres. D'ou un groupe a lui seul, et
 * son absence de tous les autres.
 */
export const CAN_BOOTSTRAP = ["SUPER_ADMIN"];
