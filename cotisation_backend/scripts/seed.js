import prisma from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/hash.js";

/**
 * Le seed ne cree plus qu'un seul compte : celui d'amorcage.
 *
 * Avant, il en creait quatre — admin, gestionnaire de depense, tresorier, super
 * admin — avec quatre mots de passe choisis par l'operateur, qui les connaissait
 * donc tous les quatre. Un decaissement pouvait etre engage, approuve et execute
 * par la meme personne sans qu'aucune trace ne distingue les trois actes.
 *
 * Desormais la chaine part d'ici et se poursuit dans l'interface :
 *   seed            -> SUPER_ADMIN      (compte d'amorcage, ce script)
 *   SUPER_ADMIN     -> OUGAS_ADMIN      (/super-admin, par invitation)
 *   OUGAS_ADMIN     -> ADMIN            (/admin, par invitation)
 *   ADMIN           -> GESTIONNAIRE_DEPENSE, EQUIPE_TRESORERIE  (par invitation)
 *
 * Chaque compte cree par invitation choisit lui-meme son mot de passe : a partir
 * de la deuxieme ligne, plus personne ne connait le secret de quelqu'un d'autre.
 */

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante pour le seed : ${name}`);
  }
  return value;
}

const MIN_PASSWORD_LENGTH = 12;

async function main() {
  const email = requiredEnv("SEED_BOOTSTRAP_EMAIL").toLowerCase();
  const password = requiredEnv("SEED_BOOTSTRAP_PASSWORD");
  const phone = process.env.SEED_BOOTSTRAP_PHONE || "77000000";

  // C'est le seul mot de passe du systeme que son titulaire n'a pas choisi
  // lui-meme, et le compte qu'il ouvre peut nommer l'autorite qui approuve
  // l'argent. Un minimum s'impose ici, meme si l'interface n'y passe jamais.
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_BOOTSTRAP_PASSWORD doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`,
    );
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
    select: { id: true, email: true, role: true },
  });

  if (existing) {
    // Refus volontaire plutot que mise a jour.
    //
    // La migration 20260916000000 a transforme l'ancien SUPER_ADMIN en
    // OUGAS_ADMIN. Si l'operateur reutilise l'adresse de cet ancien compte, une
    // mise a jour silencieuse lui retirerait le pouvoir d'approuver les
    // depenses — et personne ne s'en apercevrait avant le premier decaissement
    // bloque. On s'arrete, et on le dit.
    if (existing.role !== "SUPER_ADMIN") {
      throw new Error(
        `${existing.email} existe déjà avec le rôle ${existing.role}. ` +
          `Le compte d'amorçage doit utiliser une adresse et un téléphone qui ne servent à rien d'autre.`,
      );
    }

    console.log(`Compte d'amorçage déjà en place : ${existing.email}`);
    return;
  }

  const passwordHash = await hashPassword(password);

  const created = await prisma.user.create({
    data: {
      fullName: "Compte d'amorçage",
      email,
      phone,
      country: "Djibouti",
      city: "Djibouti",
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
    select: { email: true },
  });

  console.log(`Créé : ${created.email} | SUPER_ADMIN (compte d'amorçage)`);
  console.log("Connectez-vous sur /super-admin pour nommer le premier Ougas Admin.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
