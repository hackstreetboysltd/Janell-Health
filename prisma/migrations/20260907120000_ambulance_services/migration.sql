-- AlterTable
ALTER TABLE "AmbulanceProvider" ADD COLUMN "services" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill known liaison listings
UPDATE "AmbulanceProvider"
SET "services" = ARRAY[
  'Emergency road ambulance',
  'First aid response',
  'Hospital transfer'
]
WHERE "name" IN (
  'St John Ambulance Kenya',
  'Nairobi Rescue Co-op',
  'AAR Emergency Ambulance',
  'Amref Flying Doctors (road)'
);
