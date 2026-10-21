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


// POST /api/v1/branches
router.post("/", async (req, res) => {
  try {
    const { name, address, city, country, hotelId } = req.body;

    if (
      typeof name !== "string" || !name.trim() ||
      typeof address !== "string" || !address.trim() ||
      typeof city !== "string" || !city.trim() ||
      typeof country !== "string" || !country.trim() ||
      typeof hotelId !== "string" || !hotelId.trim()
    ) {
      res.status(400).json({
        success: false,
        message: "Name, address, city, country, and hotelId are required",
      });
      return;
    }

    const branch = await prisma.hotelBranch.create({
      data: {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        country: country.trim(),
        hotelId: hotelId.trim(),
      },
    });

    res.status(201).json({
      success: true,
      data: branch,
    });
  } catch (error) {
    console.error("Failed to create hotel branch:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create hotel branch",
    });
  }
});

export default router;