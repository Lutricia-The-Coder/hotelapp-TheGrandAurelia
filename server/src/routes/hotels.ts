
import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();


router.get("/:id", async (req, res) => {
  try {
    const hotel = await prisma.hotel.findUnique({
      where: { id: req.params.id },
      include: {
        branches: {
          include: {
            roomTypes: true,
            amenities: {
              include: {
                amenity: true,
              },
            },
          },
        },
        images: true,
        reviews: true,
      },
    });

    if (!hotel) {
      res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: hotel,
    });
  } catch (error) {
    console.error("Failed to fetch hotel:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch hotel",
    });
  }
});

// GET /api/v1/hotels
router.get("/", async (_req, res) => {
  try {
    const hotels = await prisma.hotel.findMany({
      include: {
        branches: true,
        images: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      count: hotels.length,
      data: hotels,
    });
  } catch (error) {
    console.error("Failed to fetch hotels:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch hotels",
    });
  }
});

export default router;
