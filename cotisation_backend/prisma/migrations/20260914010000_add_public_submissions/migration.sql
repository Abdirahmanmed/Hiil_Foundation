-- CreateEnum
CREATE TYPE "PublicSubmissionKind" AS ENUM ('PROJECT_PROPOSAL', 'VOLUNTEER');

-- CreateTable
CREATE TABLE "PublicSubmission" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "PublicSubmissionKind" NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organization" TEXT,
    "theme" TEXT,
    "message" TEXT,
    "skills" TEXT,
    "availability" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "handledAt" TIMESTAMP(3),

    CONSTRAINT "PublicSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicSubmission_kind_createdAt_idx" ON "PublicSubmission"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "PublicSubmission_handledAt_idx" ON "PublicSubmission"("handledAt");
