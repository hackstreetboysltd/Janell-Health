-- BookingStatus default uses PENDING_PROVIDER added in prior migration (separate transaction).
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'PENDING_PROVIDER';
