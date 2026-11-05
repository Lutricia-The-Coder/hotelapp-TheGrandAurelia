import { Router } from "express";
import prisma from "../lib/prisma.js";


const router = Router();

// GET /api/v1/hotels/:id
router.get("/:id", async (req, res) => {
  try {
    const hotel = await prisma.hotel.findUnique({
      where: { id: req.params.id },
      include: {
        branches: {
          include: {
            roomTypes: true,
            amenities: {
              include: { amenity: true },
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
    const hotel = await prisma.hotel.findFirst({
      orderBy: { createdAt: "asc" },
      include: {
        branches: true,
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    res.status(200).json({
      success: true,
      count: hotel ? 1 : 0,
      data: hotel ? [hotel] : [],
    });
  } catch (error) {
    console.error("Failed to fetch The Grand Aurelia:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch accommodation",
    });
  }
});
export default router;