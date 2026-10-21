import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

// GET /api/v1/branches/hotel/:hotelId
router.get("/hotel/:hotelId", async (req, res) => {
  try {
    const branches = await prisma.hotelBranch.findMany({
      where: { hotelId: req.params.hotelId },
      include: {
        roomTypes: true,
        amenities: {
          include: {
            amenity: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches,
    });
  } catch (error) {
    console.error("Failed to fetch hotel branches:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch hotel branches",
    });
  }
});

export default router;