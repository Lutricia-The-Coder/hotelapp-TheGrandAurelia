-- CreateTable
CREATE TABLE "HotelImage" (
    "id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hotelId" UUID NOT NULL,

    CONSTRAINT "HotelImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HotelImage_hotelId_idx" ON "HotelImage"("hotelId");

-- AddForeignKey
ALTER TABLE "HotelImage" ADD CONSTRAINT "HotelImage_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
