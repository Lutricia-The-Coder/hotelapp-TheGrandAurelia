-- AlterTable
ALTER TABLE "RoomType" ADD COLUMN     "roomTypeOptionId" UUID;

-- CreateTable
CREATE TABLE "RoomTypeOption" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomTypeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomTypeAmenity" (
    "roomTypeId" UUID NOT NULL,
    "amenityId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomTypeAmenity_pkey" PRIMARY KEY ("roomTypeId","amenityId")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomTypeOption_name_key" ON "RoomTypeOption"("name");

-- CreateIndex
CREATE INDEX "RoomTypeAmenity_amenityId_idx" ON "RoomTypeAmenity"("amenityId");

-- AddForeignKey
ALTER TABLE "RoomType" ADD CONSTRAINT "RoomType_roomTypeOptionId_fkey" FOREIGN KEY ("roomTypeOptionId") REFERENCES "RoomTypeOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomTypeAmenity" ADD CONSTRAINT "RoomTypeAmenity_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomTypeAmenity" ADD CONSTRAINT "RoomTypeAmenity_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
