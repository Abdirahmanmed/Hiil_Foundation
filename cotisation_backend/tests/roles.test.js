import { describe, expect, it } from "vitest";
import {
  CAN_APPROVE,
  CAN_BOOTSTRAP,
  CAN_DISBURSE,
  CAN_ENGAGE,
  CAN_READ_MONEY,
  CAN_SEE_CASH,
  CAN_SUPERVISE,
} from "../src/config/roles.js";
import { expenseScopeFor } from "../src/modules/expenses/expenses.service.js";

const GROUPES_METIER = {
  CAN_ENGAGE,
  CAN_APPROVE,
  CAN_DISBURSE,
  CAN_READ_MONEY,
  CAN_SUPERVISE,
  CAN_SEE_CASH,
};

/**
 * Le test le plus rentable du lot.
 *
 * Il ne demande ni base, ni concurrence, ni horloge, et c'est lui qui dira,
 * chaque fois qu'un acces est ouvert quelque part, si la separation des
 * pouvoirs a ete elargie sans qu'on le veuille.
 */
describe("séparation des pouvoirs", () => {
  it("aucun rôle ne cumule deux pouvoirs de décision", () => {
    const cumuls = [
      ...CAN_ENGAGE.filter((r) => CAN_APPROVE.includes(r) || CAN_DISBURSE.includes(r)),
      ...CAN_APPROVE.filter((r) => CAN_DISBURSE.includes(r)),
    ];
    expect(cumuls).toEqual([]);
  });

  it("l'ADMIN n'engage, n'approuve et ne décaisse jamais", () => {
    expect(CAN_ENGAGE).not.toContain("ADMIN");
    expect(CAN_APPROVE).not.toContain("ADMIN");
    expect(CAN_DISBURSE).not.toContain("ADMIN");
  });

  it("l'OUGAS_ADMIN approuve, sans jamais engager ni décaisser", () => {
    expect(CAN_APPROVE).toEqual(["OUGAS_ADMIN"]);
    expect(CAN_ENGAGE).not.toContain("OUGAS_ADMIN");
    expect(CAN_DISBURSE).not.toContain("OUGAS_ADMIN");
  });

  it("l'ADMIN lit l'argent et supervise, sans voir la caisse du trésorier", () => {
    expect(CAN_READ_MONEY).toContain("ADMIN");
    expect(CAN_SUPERVISE).toContain("ADMIN");
    expect(CAN_SEE_CASH).not.toContain("ADMIN");
  });

  it("un CLIENT ne touche à aucun groupe interne", () => {
    for (const groupe of Object.values(GROUPES_METIER)) {
      expect(groupe).not.toContain("CLIENT");
    }
  });
});

/**
 * La regression que ce bloc empeche : glisser le compte d'amorcage dans un
 * groupe metier « pour qu'il puisse verifier ». Celui qui nomme l'approbateur
 * ne doit ni approuver, ni voir un montant — sinon il reconstitue a lui seul
 * toute la chaine de decaissement.
 */
describe("compte d'amorçage", () => {
  it("le SUPER_ADMIN n'appartient à aucun groupe métier", () => {
    for (const [nom, groupe] of Object.entries(GROUPES_METIER)) {
      expect(groupe, `${nom} contient SUPER_ADMIN`).not.toContain("SUPER_ADMIN");
    }
  });

  it("CAN_BOOTSTRAP ne contient que le SUPER_ADMIN", () => {
    expect(CAN_BOOTSTRAP).toEqual(["SUPER_ADMIN"]);
  });

  it("aucun autre rôle n'amorce", () => {
    for (const groupe of Object.values(GROUPES_METIER)) {
      for (const role of groupe) {
        expect(CAN_BOOTSTRAP).not.toContain(role);
      }
    }
  });
});

describe("périmètre de lecture des dépenses", () => {
  const cas = [
    ["GESTIONNAIRE_DEPENSE", { createdById: "u1" }],
    ["EQUIPE_TRESORERIE", { status: "APPROUVER" }],
    ["ADMIN", {}],
    ["OUGAS_ADMIN", {}],
  ];

  it.each(cas)("%s est scopé explicitement", (role, attendu) => {
    expect(expenseScopeFor({ role, id: "u1" })).toEqual(attendu);
  });

  // La regression a eviter : un `else {}` muet qui rendrait TOUT visible a un
  // role non prevu. C'est exactement ce qui donnait au tresorier les agregats
  // de toutes les depenses via le tableau de bord. SUPER_ADMIN figure dans
  // cette liste a dessein : le compte d'amorcage ne lit aucune depense.
  it.each([["CLIENT"], ["SUPER_ADMIN"], ["ROLE_INCONNU"], [undefined]])(
    "%s est refusé plutôt que de tout voir",
    (role) => {
      expect(() => expenseScopeFor({ role, id: "u1" })).toThrowError();
    },
  );
});
