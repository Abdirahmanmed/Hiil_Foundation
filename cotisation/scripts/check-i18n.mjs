#!/usr/bin/env node
/**
 * Vérifie que chaque clé appelée par l'interface existe dans la langue de repli.
 *
 * C'est la seule vérification de tout ce chantier qui EMPÊCHE une régression au
 * lieu de la corriger. Elle tourne en `prebuild`, donc avant chaque build, y
 * compris sur Vercel : un déploiement avec une clé manquante échoue ici plutôt
 * que d'afficher `superAdmin.stats.users` à un utilisateur.
 *
 * Deux niveaux volontairement distincts :
 *   - clé appelée et absente du repli  -> ERREUR bloquante
 *   - divergence entre langues          -> simple avertissement
 * Bloquer sur la divergence rendrait impossible d'ajouter une clé tant que les
 * quatre traductions ne sont pas prêtes, et le script finirait désactivé.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(RACINE, "src");
const REPLI = "fr";

function fichiersSource(dossier, acc = []) {
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) fichiersSource(chemin, acc);
    else if (/\.(jsx?|tsx?)$/.test(entree.name)) acc.push(chemin);
  }
  return acc;
}

function trouverLocales() {
  const candidats = [path.join(SRC, "i18n"), path.join(SRC, "locales")];
  for (const dossier of candidats) {
    if (!fs.existsSync(dossier)) continue;
    const fichiers = fs
      .readdirSync(dossier)
      .filter((f) => f.endsWith(".json"))
      .map((f) => [path.basename(f, ".json"), path.join(dossier, f)]);
    if (fichiers.length) return Object.fromEntries(fichiers);
  }
  return {};
}

function aplatir(objet, prefixe = "", acc = new Set()) {
  for (const [cle, valeur] of Object.entries(objet || {})) {
    const complet = prefixe ? `${prefixe}.${cle}` : cle;
    if (valeur && typeof valeur === "object" && !Array.isArray(valeur)) {
      aplatir(valeur, complet, acc);
    } else {
      acc.add(complet);
    }
  }
  return acc;
}

// On ne retient que les appels t("literal"). Les clés construites en template
// (`t(\`enumStatus.${s}\`)`) ne sont pas vérifiables statiquement et
// produiraient des faux positifs.
//
// Le second groupe capture la présence d'une valeur de repli : `t("cle", "texte")`
// affiche ce texte quand la clé manque, donc l'absence de traduction n'est pas
// une erreur bloquante — seulement une traduction à faire. Sans repli,
// i18next affiche la clé brute à l'utilisateur : c'est une erreur.
const APPEL_T = /\bt\(\s*["']([^"'`]+)["']\s*(,\s*["'])?/g;

const locales = trouverLocales();
if (!Object.keys(locales).length) {
  console.error("check-i18n : aucun fichier de langue trouvé.");
  process.exit(1);
}

const clesParLangue = Object.fromEntries(
  Object.entries(locales).map(([langue, chemin]) => [
    langue,
    aplatir(JSON.parse(fs.readFileSync(chemin, "utf8"))),
  ]),
);

const utilisees = new Map();
for (const fichier of fichiersSource(SRC)) {
  const contenu = fs.readFileSync(fichier, "utf8");
  for (const m of contenu.matchAll(APPEL_T)) {
    const [, cle, repli] = m;
    const existant = utilisees.get(cle);
    // Une clé appelée à plusieurs endroits n'est protégée que si TOUS ses
    // appels portent un repli.
    utilisees.set(cle, {
      fichier: existant?.fichier || path.relative(RACINE, fichier),
      avecRepli: existant ? existant.avecRepli && Boolean(repli) : Boolean(repli),
    });
  }
}

const cleRepli = clesParLangue[REPLI];
if (!cleRepli) {
  console.error(`check-i18n : la langue de repli « ${REPLI} » est introuvable.`);
  process.exit(1);
}

const absentesDuRepli = [...utilisees.entries()].filter(([c]) => !cleRepli.has(c));
const bloquantes = absentesDuRepli.filter(([, i]) => !i.avecRepli).map(([c]) => c).sort();
const aTraduire = absentesDuRepli.filter(([, i]) => i.avecRepli).length;

console.log(`check-i18n : ${utilisees.size} clés littérales appelées.`);
for (const [langue, cles] of Object.entries(clesParLangue)) {
  const absentes = [...utilisees.keys()].filter((c) => !cles.has(c)).length;
  console.log(`  ${langue.padEnd(3)} ${String(cles.size).padStart(4)} clés, ${absentes} appelée(s) sans traduction`);
}

if (aTraduire) {
  console.warn(
    `\ncheck-i18n : ${aTraduire} clé(s) sans traduction mais AVEC texte de repli dans le code. ` +
      `Non bloquant — à traduire quand l'occasion se présente.`,
  );
}

if (bloquantes.length) {
  console.error(
    `\ncheck-i18n : ${bloquantes.length} clé(s) appelée(s) SANS repli et absente(s) de « ${REPLI} », ` +
      `qui est la langue de repli. i18next affiche la clé brute à l'utilisateur.\n`,
  );
  for (const cle of bloquantes.slice(0, 40)) {
    console.error(`  ${cle}  (${utilisees.get(cle).fichier})`);
  }
  if (bloquantes.length > 40) console.error(`  … et ${bloquantes.length - 40} autres`);
  process.exit(1);
}

console.log("check-i18n : aucune clé appelée sans repli ni traduction.");
