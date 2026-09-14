-- CreateEnum
CREATE TYPE "MembershipTier" AS ENUM ('BASIC', 'PROFESSIONAL');

-- AlterTable CaregiverProfile
ALTER TABLE "CaregiverProfile" ADD COLUMN "membershipTier" "MembershipTier" NOT NULL DEFAULT 'BASIC';
ALTER TABLE "CaregiverProfile" ADD COLUMN "membershipUntil" TIMESTAMP(3);
ALTER TABLE "CaregiverProfile" ADD COLUMN "featuredUntil" TIMESTAMP(3);

-- AlterTable Case
ALTER TABLE "Case" ADD COLUMN "institutionId" TEXT;

-- CreateTable Institution
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable AmbulanceProvider
CREATE TABLE "AmbulanceProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "coverageArea" TEXT NOT NULL DEFAULT 'Nairobi',
    "monthlyFeeKes" INTEGER NOT NULL DEFAULT 1000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmbulanceProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable VisitNote
CREATE TABLE "VisitNote" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Institution_slug_key" ON "Institution"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "VisitNote_bookingId_key" ON "VisitNote"("bookingId");

-- CreateIndex
CREATE INDEX "VisitNote_caregiverId_idx" ON "VisitNote"("caregiverId");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitNote" ADD CONSTRAINT "VisitNote_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitNote" ADD CONSTRAINT "VisitNote_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "CaregiverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed partner institutions
INSERT INTO "Institution" ("id", "name", "slug", "description", "contactPhone", "isActive", "updatedAt")
VALUES
  ('inst_knh', 'Kenyatta National Hospital', 'knh', 'Discharge-to-home nursing and post-hospital care referrals.', '0202726300', true, CURRENT_TIMESTAMP),
  ('inst_nairobi_hospital', 'The Nairobi Hospital', 'nairobi-hospital', 'Partner discharge coordination for home visits in Nairobi.', '0202845000', true, CURRENT_TIMESTAMP);

-- Seed ambulance liaison listings
INSERT INTO "AmbulanceProvider" ("id", "name", "phone", "coverageArea", "monthlyFeeKes", "isActive", "sortOrder", "updatedAt")
VALUES
  ('amb_st_john', 'St John Ambulance Kenya', '0721225837', 'Nairobi & environs', 1000, true, 1, CURRENT_TIMESTAMP),
  ('amb_rescue_co', 'Nairobi Rescue Co-op', '0700123456', 'Greater Nairobi', 1000, true, 2, CURRENT_TIMESTAMP);
