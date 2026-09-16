/**
 * Garde-fou non negociable.
 *
 * Les tests qui touchent la base la vident entre chaque fichier. Si
 * DATABASE_URL pointe ailleurs que sur une base de TEST, on refuse de demarrer
 * plutot que de decouvrir apres coup qu'on a efface la production.
 *
 * Les tests purs (schemas, calendrier, matrice des roles, resolution de
 * chemins) n'ont besoin d'aucune base et tournent toujours.
 */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL || "";

  if (!url) {
    console.log(
      "\n[tests] TEST_DATABASE_URL absente : seuls les tests sans base tournent.\n" +
        "        Pour les autres : TEST_DATABASE_URL=postgresql://…/cotisation_test\n",
    );
    return;
  }

  if (!/test/i.test(url)) {
    throw new Error(
      "REFUS : TEST_DATABASE_URL ne contient pas « test ». " +
        "Refuse de lancer les tests contre cette base.",
    );
  }

  process.env.DATABASE_URL = url;
}
