CREATE TABLE "BranchFavorite" (
    "userId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BranchFavorite_pkey" PRIMARY KEY ("userId", "branchId")
);

INSERT INTO "BranchFavorite" ("userId", "branchId", "createdAt")
SELECT favorite."userId", branch."id", favorite."createdAt"
FROM "Favorite" AS favorite
INNER JOIN "HotelBranch" AS branch
ON branch."hotelId" = favorite."hotelId";

CREATE INDEX "BranchFavorite_branchId_idx" ON "BranchFavorite"("branchId");

ALTER TABLE "BranchFavorite"
ADD CONSTRAINT "BranchFavorite_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BranchFavorite"
ADD CONSTRAINT "BranchFavorite_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "HotelBranch"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
