-- Keep existing hotel reviews intact; new reviews are associated with a branch.
ALTER TABLE "Review" ADD COLUMN "branchId" UUID;

DROP INDEX "Review_userId_hotelId_key";

CREATE UNIQUE INDEX "Review_userId_branchId_key" ON "Review"("userId", "branchId");
CREATE INDEX "Review_branchId_idx" ON "Review"("branchId");

ALTER TABLE "Review"
ADD CONSTRAINT "Review_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "HotelBranch"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
