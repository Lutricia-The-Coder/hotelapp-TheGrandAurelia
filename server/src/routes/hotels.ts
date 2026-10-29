
import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";


const router = Router();

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const hotelId = req.params.id;

if (typeof hotelId !== "string") {
  res.status(400).json({
    success: false,
    message: "Invalid hotel ID",
  });
  return;
}
    const hotel = await prisma.hotel.delete({
where: { id: hotelId },    });

    res.status(200).json({
      success: true,
      message: "Hotel deleted successfully",
      data: hotel,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
      return;
    }

    console.error("Failed to delete hotel:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete hotel",
    });
  }
});

router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
    const { name, description } = req.body;

    if (name === undefined && description === undefined) {
      res.status(400).json({
        success: false,
        message: "Provide a name or description to update",
      });
      return;
    }

    if (
      name !== undefined &&
      (typeof name !== "string" || name.trim().length === 0)
    ) {
      res.status(400).json({
        success: false,
        message: "Hotel name must be a non-empty string",
      });
      return;
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      res.status(400).json({
        success: false,
        message: "Description must be a string or null",
      });
      return;
    }
const hotelId = req.params.id;

if (typeof hotelId !== "string") {
  res.status(400).json({
    success: false,
    message: "Invalid hotel ID",
  });
  return;
}
    const hotel = await prisma.hotel.update({
where: { id: hotelId },     
 data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(description !== undefined
          ? { description: description?.trim() || null }
          : {}),
      },
    });

    res.status(200).json({
      success: true,
      data: hotel,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
      return;
    }

    console.error("Failed to update hotel:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update hotel",
    });
  }
});


router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (
      typeof name !== "string" ||
      name.trim().length === 0
    ) {
      res.status(400).json({
        success: false,
        message: "Hotel name is required",
      });
      return;
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      res.status(400).json({
        success: false,
        message: "Description must be a string",
      });
      return;
    }

    const hotel = await prisma.hotel.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    res.status(201).json({
      success: true,
      data: hotel,
    });
  } catch (error) {
    console.error("Failed to create hotel:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create hotel",
    });
  }
});


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
  images: {
    orderBy: {
      sortOrder: "asc",
    },
  },
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
