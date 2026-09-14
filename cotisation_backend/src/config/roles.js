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
 *   celui qui supervise ne decide pas.
 *
 * Controle : aucun de ces trois groupes ne doit jamais contenir ADMIN.
 *   grep -nE '^export const CAN_(ENGAGE|APPROVE|DISBURSE)' src/config/roles.js | grep -w ADMIN
 *   (le -w est indispensable : sans lui, ADMIN matche aussi SUPER_ADMIN)
 */

/** Creer une depense. Le terrain engage, et rien d'autre. */
export const CAN_ENGAGE = ["GESTIONNAIRE_DEPENSE"];

/** Approuver ou rejeter une depense. Une seule autorite. */
export const CAN_APPROVE = ["SUPER_ADMIN"];

/** Emettre, annuler ou executer un ordre de paiement. */
export const CAN_DISBURSE = ["EQUIPE_TRESORERIE"];

/** Lire les depenses et les ordres. Le perimetre exact depend du role, voir expenseScopeFor(). */
export const CAN_READ_MONEY = [
  "GESTIONNAIRE_DEPENSE",
  "EQUIPE_TRESORERIE",
  "SUPER_ADMIN",
  "ADMIN",
];

/** Lecture transverse et journal d'audit. Superviser n'est pas decider. */
export const CAN_SUPERVISE = ["ADMIN", "SUPER_ADMIN"];

/** Position de caisse consolidee. */
export const CAN_SEE_CASH = ["EQUIPE_TRESORERIE", "SUPER_ADMIN"];
