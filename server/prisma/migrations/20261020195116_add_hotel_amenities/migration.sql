-- CreateTable
CREATE TABLE "Amenity" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchAmenity" (
    "branchId" UUID NOT NULL,
    "amenityId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BranchAmenity_pkey" PRIMARY KEY ("branchId","amenityId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_name_key" ON "Amenity"("name");

-- CreateIndex
CREATE INDEX "BranchAmenity_amenityId_idx" ON "BranchAmenity"("amenityId");

-- AddForeignKey
ALTER TABLE "BranchAmenity" ADD CONSTRAINT "BranchAmenity_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "HotelBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchAmenity" ADD CONSTRAINT "BranchAmenity_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
