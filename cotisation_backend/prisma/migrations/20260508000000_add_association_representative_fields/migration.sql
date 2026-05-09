-- Add association-specific registration metadata without changing existing CLIENT_ADHERENT fields.
ALTER TABLE "User"
ADD COLUMN "associationStatus" TEXT,
ADD COLUMN "representativeType" TEXT,
ADD COLUMN "representativeName" TEXT,
ADD COLUMN "representativePhone" TEXT,
ADD COLUMN "representativeAddress" TEXT,
ADD COLUMN "representativeEmail" TEXT,
ADD COLUMN "presidentIdDocPath" TEXT;
