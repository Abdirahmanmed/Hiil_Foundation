-- Replace the association status free-text field with a private uploaded document reference.
ALTER TABLE "User"
ADD COLUMN "associationStatusDocPath" TEXT;

ALTER TABLE "User"
DROP COLUMN IF EXISTS "associationStatus";
