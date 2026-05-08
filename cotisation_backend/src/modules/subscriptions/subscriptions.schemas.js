import { z } from "zod";

export const FrequencyEnum = z.enum(["MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"]);
export const PaymentModeEnum = z.enum(["AUTOMATIC", "MANUAL"]);
export const PaymentMethodEnum = z.enum(["BANK_TRANSFER", "WALLET"]);
export const WalletProviderEnum = z.enum(["WAAFI", "CAC_PAY", "D_MONEY", "SABAPAY", "DAHABPLACE"]);

export const createSubscriptionSchema = z
  .object({
    bankCountry: z.string().min(1, "bankCountry requis"),
    bankName: z.string().min(1, "bankName requis"),
    currency: z.string().min(1, "currency requis"),

    paymentMethod: PaymentMethodEnum,

    // BANK_TRANSFER
    mode: PaymentModeEnum.optional(),
    accountNumber: z.string().optional(),
    rib: z.string().optional(),
    swiftBic: z.string().optional(),

    // WALLET (uniquement Djibouti)
    walletProvider: WalletProviderEnum.optional(),
    walletAccount: z.string().optional(),

    amount: z.coerce.number().int().positive("amount doit être > 0"),
    frequency: FrequencyEnum,
  })
  .superRefine((data, ctx) => {
    const country = (data.bankCountry || "").trim().toLowerCase();

    if (data.paymentMethod === "WALLET") {
      if (country !== "djibouti") {
        ctx.addIssue({
          code: "custom",
          path: ["paymentMethod"],
          message: "Le paiement WALLET est disponible uniquement pour Djibouti.",
        });
      }

      if (!data.walletProvider) {
        ctx.addIssue({
          code: "custom",
          path: ["walletProvider"],
          message: "walletProvider requis si WALLET.",
        });
      }

      if (!data.walletAccount || data.walletAccount.trim().length < 6) {
        ctx.addIssue({
          code: "custom",
          path: ["walletAccount"],
          message: "walletAccount requis (numéro wallet).",
        });
      }

      // Empêcher d’envoyer des champs de virement
      if (data.mode) {
        ctx.addIssue({
          code: "custom",
          path: ["mode"],
          message: "mode ne doit pas être fourni si WALLET.",
        });
      }
    }

    if (data.paymentMethod === "BANK_TRANSFER") {
      if (!data.mode) {
        ctx.addIssue({
          code: "custom",
          path: ["mode"],
          message: "mode requis pour virement bancaire.",
        });
      }

      if (!data.accountNumber || !data.accountNumber.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["accountNumber"],
          message: "accountNumber requis pour virement bancaire.",
        });
      }

      // Empêcher d’envoyer wallet
      if (data.walletProvider || data.walletAccount) {
        ctx.addIssue({
          code: "custom",
          path: ["walletProvider"],
          message: "walletProvider/walletAccount ne doivent pas être fournis si BANK_TRANSFER.",
        });
      }
    }
  });

export const consentSchema = z.object({
  accepted: z.coerce.boolean(),
});
