-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'WALLET');

-- CreateEnum
CREATE TYPE "WalletProvider" AS ENUM ('WAAFI', 'CAC_PAY', 'D_MONEY', 'SABAPAY', 'DAHABPLACE');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
ADD COLUMN     "walletAccount" TEXT,
ADD COLUMN     "walletProvider" "WalletProvider",
ALTER COLUMN "accountNumber" DROP NOT NULL,
ALTER COLUMN "rib" DROP NOT NULL,
ALTER COLUMN "swiftBic" DROP NOT NULL,
ALTER COLUMN "mode" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Subscription_userId_createdAt_idx" ON "Subscription"("userId", "createdAt");
