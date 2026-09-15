import { describe, expect, it } from "vitest";

import {
  approveExpenseSchema,
  createExpenseSchema,
  rejectExpenseSchema,
} from "../src/modules/expenses/expenses.schemas.js";
import {
  cancelPaymentOrderSchema,
  createPaymentOrderSchema,
} from "../src/modules/payment-orders/paymentOrders.schemas.js";
import { consentSchema } from "../src/modules/subscriptions/subscriptions.schemas.js";
import { publicSubmissionSchema } from "../src/modules/public-forms/publicForms.schemas.js";
import { resetPasswordSchema } from "../src/modules/auth/auth.schemas.js";

const depenseValide = {
  type: "ALIMENTATION",
  label: "Riz",
  quantity: 10,
  unitPrice: 1000,
  beneficiaryName: "Famille A",
  beneficiaryCountry: "DJIBOUTI",
  beneficiaryCity: "Ali Sabieh",
};

describe("consentement", () => {
  // z.coerce.boolean() appliquait Boolean(input) : la chaine "false" devenait
  // true, sur le champ qui sert de preuve juridique d'adhesion.
  it("accepte uniquement le booléen true", () => {
    expect(consentSchema.safeParse({ accepted: true }).success).toBe(true);
  });

  it.each([["false"], ["non"], [""], [0], [1], ["true"]])(
    "refuse %o",
    (valeur) => {
      expect(consentSchema.safeParse({ accepted: valeur }).success).toBe(false);
    },
  );
});

describe("approbation et rejet d'une dépense", () => {
  it("exige le mot de passe de l'approbateur", () => {
    expect(approveExpenseSchema.safeParse({}).success).toBe(false);
    expect(approveExpenseSchema.safeParse({ password: "" }).success).toBe(false);
    expect(approveExpenseSchema.safeParse({ password: "x" }).success).toBe(true);
  });

  it("exige un motif de rejet d'au moins 3 caractères", () => {
    expect(rejectExpenseSchema.safeParse({}).success).toBe(false);
    expect(rejectExpenseSchema.safeParse({ reason: "ok" }).success).toBe(false);
    expect(rejectExpenseSchema.safeParse({ reason: "Devis non conforme" }).success).toBe(true);
  });
});

describe("ordre de paiement", () => {
  const base = {
    expenseId: "e1",
    paymentMethod: "VIREMENT_BANCAIRE",
    currency: "FRANC",
    paymentCountry: "DJIBOUTI",
    amount: 1000,
    bankName: "CAC Bank",
    bankReference: "REF1",
  };

  it("n'exige plus de jeton d'approbation", () => {
    expect(createPaymentOrderSchema.safeParse(base).success).toBe(true);
  });

  it("ignore un jeton envoyé par un ancien bundle plutôt que de rejeter", () => {
    const r = createPaymentOrderSchema.safeParse({ ...base, token: "obsolete" });
    expect(r.success).toBe(true);
    expect(r.data.token).toBeUndefined();
  });

  it("exige les champs bancaires pour un virement", () => {
    const { bankName, bankReference, ...sansBanque } = base;
    expect(createPaymentOrderSchema.safeParse(sansBanque).success).toBe(false);
  });

  it("exige un motif d'annulation", () => {
    expect(cancelPaymentOrderSchema.safeParse({ reason: "no" }).success).toBe(false);
    expect(cancelPaymentOrderSchema.safeParse({ reason: "RIB erroné" }).success).toBe(true);
  });
});

describe("dépense", () => {
  it("accepte une dépense sans montant : il est dérivé côté serveur", () => {
    const r = createExpenseSchema.safeParse(depenseValide);
    expect(r.success).toBe(true);
    expect(r.data.quantity * r.data.unitPrice).toBe(10_000);
  });

  // Le service refuse cet ecart : c'est la porte d'entree du detournement,
  // 10 sacs a 1 000 declares 500 000.
  it("laisse passer un montant incohérent au schéma, que le service rejette", () => {
    const r = createExpenseSchema.safeParse({ ...depenseValide, amount: 500_000 });
    expect(r.success).toBe(true);
    expect(r.data.amount).not.toBe(r.data.quantity * r.data.unitPrice);
  });

  it("a une devise, par défaut le franc", () => {
    expect(createExpenseSchema.safeParse(depenseValide).data.currency).toBe("FRANC");
  });
});

describe("candidatures publiques", () => {
  it("exige un email sur une candidature projet", () => {
    const r = publicSubmissionSchema.safeParse({
      kind: "PROJECT_PROPOSAL",
      fullName: "Amina Ali",
      message: "Construire un puits à Ali Sabieh pour 400 familles.",
    });
    expect(r.success).toBe(false);
  });

  it("normalise l'email en minuscules", () => {
    const r = publicSubmissionSchema.safeParse({
      kind: "VOLUNTEER",
      fullName: "Youssouf M",
      email: "Y.M@Exemple.DJ",
    });
    expect(r.data.email).toBe("y.m@exemple.dj");
  });

  // Le honeypot doit passer la validation : le rejeter renverrait un 400 qui
  // apprend au robot qu'il a ete detecte. C'est le controleur qui l'ignore.
  it("accepte le honeypot au lieu de le rejeter", () => {
    const r = publicSubmissionSchema.safeParse({
      kind: "VOLUNTEER",
      fullName: "Bot",
      email: "bot@spam.ru",
      website: "http://spam",
    });
    expect(r.success).toBe(true);
    expect(r.data.website).toBe("http://spam");
  });
});

describe("réinitialisation de mot de passe", () => {
  it("exige un jeton, 8 caractères, et une confirmation identique", () => {
    expect(resetPasswordSchema.safeParse({ password: "motdepasse1", confirmPassword: "motdepasse1" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: "t", password: "court", confirmPassword: "court" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: "t", password: "motdepasse1", confirmPassword: "autre12345" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: "t", password: "motdepasse1", confirmPassword: "motdepasse1" }).success).toBe(true);
  });
});
