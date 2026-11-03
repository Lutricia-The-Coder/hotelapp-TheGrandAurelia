-- AlterTable
ALTER TABLE "HotelBranch" ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
