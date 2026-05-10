ALTER TABLE "PaymentOrder"
  ADD COLUMN "bankCountry" "Country",
  ADD COLUMN "bankName" TEXT,
  ADD COLUMN "bankReference" TEXT,
  ADD COLUMN "bankAccountHolder" TEXT;
