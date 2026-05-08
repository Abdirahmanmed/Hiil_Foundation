-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CLIENT_ADHERENT', 'ASSOCIATION');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'CLIENT_ADHERENT',
ADD COLUMN     "commune" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "phone2" TEXT,
ALTER COLUMN "fullName" DROP NOT NULL;
