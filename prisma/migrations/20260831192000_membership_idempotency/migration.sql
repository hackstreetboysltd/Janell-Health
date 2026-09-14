-- CreateTable
CREATE TABLE "MembershipPurchase" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPurchase_idempotencyKey_key" ON "MembershipPurchase"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MembershipPurchase_caregiverId_createdAt_idx" ON "MembershipPurchase"("caregiverId", "createdAt");

-- AddForeignKey
ALTER TABLE "MembershipPurchase" ADD CONSTRAINT "MembershipPurchase_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "CaregiverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
