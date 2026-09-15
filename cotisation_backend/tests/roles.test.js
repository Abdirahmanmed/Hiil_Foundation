import { describe, expect, it } from "vitest";
import {
  CAN_APPROVE,
  CAN_DISBURSE,
  CAN_ENGAGE,
  CAN_READ_MONEY,
  CAN_SEE_CASH,
  CAN_SUPERVISE,
} from "../src/config/roles.js";
import { expenseScopeFor } from "../src/modules/expenses/expenses.service.js";

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

  it("le SUPER_ADMIN n'engage ni ne décaisse", () => {
    expect(CAN_ENGAGE).not.toContain("SUPER_ADMIN");
    expect(CAN_DISBURSE).not.toContain("SUPER_ADMIN");
  });

  it("l'ADMIN lit l'argent et supervise, sans voir la caisse du trésorier", () => {
    expect(CAN_READ_MONEY).toContain("ADMIN");
    expect(CAN_SUPERVISE).toContain("ADMIN");
    expect(CAN_SEE_CASH).not.toContain("ADMIN");
  });

  it("un CLIENT ne touche à aucun groupe interne", () => {
    for (const groupe of [CAN_ENGAGE, CAN_APPROVE, CAN_DISBURSE, CAN_READ_MONEY, CAN_SUPERVISE, CAN_SEE_CASH]) {
      expect(groupe).not.toContain("CLIENT");
    }
  });
});

describe("périmètre de lecture des dépenses", () => {
  const cas = [
    ["GESTIONNAIRE_DEPENSE", { createdById: "u1" }],
    ["EQUIPE_TRESORERIE", { status: "APPROUVER" }],
    ["ADMIN", {}],
    ["SUPER_ADMIN", {}],
  ];

  it.each(cas)("%s est scopé explicitement", (role, attendu) => {
    expect(expenseScopeFor({ role, id: "u1" })).toEqual(attendu);
  });

  // La regression a eviter : un `else {}` muet qui rendrait TOUT visible a un
  // role non prevu. C'est exactement ce qui donnait au tresorier les agregats
  // de toutes les depenses via le tableau de bord.
  it.each([["CLIENT"], ["ROLE_INCONNU"], [undefined]])(
    "%s est refusé plutôt que de tout voir",
    (role) => {
      expect(() => expenseScopeFor({ role, id: "u1" })).toThrowError();
    },
  );
});
