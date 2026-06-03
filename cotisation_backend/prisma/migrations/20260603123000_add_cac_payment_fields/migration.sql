ALTER TABLE "Subscription"
ADD COLUMN "cacPaymentRequestId" TEXT,
ADD COLUMN "cacConfirmReference" TEXT,
ADD COLUMN "cacReference" TEXT,
ADD COLUMN "cacStatus" TEXT,
ADD COLUMN "cacRawResponse" JSONB,
ADD COLUMN "paidAt" TIMESTAMP(3);

CREATE INDEX "Subscription_cacReference_idx" ON "Subscription"("cacReference");
CREATE INDEX "Subscription_cacStatus_idx" ON "Subscription"("cacStatus");
