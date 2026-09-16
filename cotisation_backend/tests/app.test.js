import { describe, expect, it, beforeAll } from "vitest";

/**
 * Le test le plus bete du lot, et celui qui vient d'attraper un vrai bug.
 *
 * `node --check` ne valide que la syntaxe : un contrôleur référencé dans un
 * routeur mais absent de ses imports passe le contrôle et fait tomber le
 * serveur au démarrage. Ici on charge réellement l'application, donc toutes
 * les routes, tous les services et toutes leurs dépendances.
 */
describe("l'application se charge entièrement", () => {
  let app;

  // 60 s, et non les 10 s par defaut : ce hook charge toute l'application,
  // client Prisma compris. Sur une machine au repos il met 2 a 3 secondes ; il
  // a depasse 30 s pendant un `git gc`, antivirus en train de scanner les
  // objets repackes. Le plafond est large a dessein — une vraie regression se
  // manifeste par une erreur de chargement immediate, jamais par une lenteur,
  // donc rien ne se cache derriere ce delai. Le depassement, lui, faisait
  // passer les deux tests en « skipped » : un echec vert, le pire des deux.
  beforeAll(async () => {
    // env.js exige ces valeurs au boot ; on ne teste pas la configuration ici.
    process.env.NODE_ENV = process.env.NODE_ENV || "development";
    process.env.CAC_PAYMENT_MODE = process.env.CAC_PAYMENT_MODE || "mock";
    ({ app } = await import("../src/app.js"));
  }, 60_000);

  it("expose une application express", () => {
    expect(typeof app).toBe("function");
  });

  it("monte tous ses routeurs sans référence manquante", () => {
    const pile = app._router?.stack || app.router?.stack || [];
    // 8 routeurs métier + les middlewares globaux.
    expect(pile.length).toBeGreaterThan(10);
  });
});
