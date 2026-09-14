-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ProviderDocumentType" AS ENUM ('NATIONAL_ID', 'PROFESSION_LICENSE', 'CERTIFICATE', 'OTHER');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "CaregiverProfile" ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "CaregiverProfile" ADD COLUMN "verificationNote" TEXT;
ALTER TABLE "CaregiverProfile" ADD COLUMN "yearsExperience" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CaregiverProfile" ADD COLUMN "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CaregiverProfile" ADD COLUMN "bio" TEXT NOT NULL DEFAULT '';

-- Existing providers stay visible until re-verified manually.
UPDATE "CaregiverProfile" SET "verificationStatus" = 'APPROVED', "isActive" = true WHERE "isActive" = true;

-- AlterTable
ALTER TABLE "CaregiverProfile" ALTER COLUMN "isActive" SET DEFAULT false;

-- CreateTable
CREATE TABLE "ProviderDocument" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "documentType" "ProviderDocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationAudit" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderDocument_caregiverId_idx" ON "ProviderDocument"("caregiverId");

-- CreateIndex
CREATE INDEX "VerificationAudit_caregiverId_idx" ON "VerificationAudit"("caregiverId");

-- CreateIndex
CREATE INDEX "VerificationAudit_adminUserId_idx" ON "VerificationAudit"("adminUserId");

-- AddForeignKey
ALTER TABLE "ProviderDocument" ADD CONSTRAINT "ProviderDocument_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "CaregiverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationAudit" ADD CONSTRAINT "VerificationAudit_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "CaregiverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationAudit" ADD CONSTRAINT "VerificationAudit_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
