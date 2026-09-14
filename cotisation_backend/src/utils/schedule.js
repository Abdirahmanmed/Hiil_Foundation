/**
 * Echeances de cotisation, sans echeancier et sans tache planifiee.
 *
 * Trois options avaient ete pesees. Une table d'echeances generee a l'avance
 * est plus riche, mais il faut la REgenerer a chaque changement de montant ou
 * de periodicite, elle se remplit de lignes vides, et elle impose un service
 * cron facture a part sur Render. Ne rien faire fait perdre la notion de
 * retard, donc l'interet meme de la periodicite.
 *
 * Retenu : une seule colonne `nextDueDate`, avancee a chaque encaissement
 * confirme, et le retard calcule a la lecture. Meme information, une colonne,
 * zero service supplementaire.
 */

const MOIS_PAR_FREQUENCE = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMIANNUAL: 6,
  ANNUAL: 12,
};

/**
 * Avance une date de `count` periodes.
 *
 * Le seul piege est le dernier jour du mois : `setMonth` deborde, donc
 * 31 janvier + 1 mois donnerait le 3 mars. On fixe le jour a 1 avant d'avancer,
 * puis on le ramene au minimum entre le jour d'origine et le dernier jour du
 * mois d'arrivee.
 */
export function addPeriods(date, frequency, count = 1) {
  const mois = MOIS_PAR_FREQUENCE[frequency];
  if (!mois) throw new Error(`Fréquence inconnue : ${frequency}`);

  const source = new Date(date);
  const jour = source.getUTCDate();

  const cible = new Date(source);
  cible.setUTCDate(1);
  cible.setUTCMonth(cible.getUTCMonth() + mois * count);

  const dernierJourDuMois = new Date(
    Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth() + 1, 0),
  ).getUTCDate();

  cible.setUTCDate(Math.min(jour, dernierJourDuMois));
  return cible;
}

/** Debut de la periode couverte par un versement, normalise au jour. */
export function periodStartFor(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Nombre de jours de retard, 0 si a jour. Calcul pur : aucune tache planifiee
 * n'a besoin de tourner pour que ce chiffre soit juste.
 */
export function overdueDays(nextDueDate, now = new Date()) {
  if (!nextDueDate) return 0;
  const ecart = now.getTime() - new Date(nextDueDate).getTime();
  return ecart <= 0 ? 0 : Math.floor(ecart / 86_400_000);
}

/**
 * Cle d'idempotence d'un encaissement : stable pour une cotisation et une
 * echeance donnees. L'ancien venderRef contenait Date.now() et changeait a
 * chaque clic — deux clics produisaient deux OTP valides, donc un double debit
 * possible sans trace du premier.
 */
export function idempotencyKeyFor(subscriptionId, periodStart) {
  const d = periodStartFor(periodStart);
  return `SUB-${subscriptionId}-${d.toISOString().slice(0, 10)}`;
}
