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

// PUT /api/v1/branches/:id
router.put("/:id", async (req, res) => {
  try {
    const { name, address, city, country, phone, checkInTime, checkOutTime, cancellationPolicy } =
      req.body;

    const data: {
      name?: string;
      address?: string;
      city?: string;
      country?: string;
      phone?: string | null;
      checkInTime?: string | null;
      checkOutTime?: string | null;
      cancellationPolicy?: string | null;
    } = {};

    for (const [field, value] of Object.entries({
      name,
      address,
      city,
      country,
    })) {
      if (value !== undefined) {
        if (typeof value !== "string" || !value.trim()) {
          res.status(400).json({
            success: false,
            message: `${field} must be a non-empty string`,
          });
          return;
        }

        data[field as "name" | "address" | "city" | "country"] = value.trim();
      }
    }

    for (const [field, value] of Object.entries({
      phone,
      checkInTime,
      checkOutTime,
      cancellationPolicy,
    })) {
      if (value !== undefined) {
        if (value !== null && typeof value !== "string") {
          res.status(400).json({
            success: false,
            message: `${field} must be a string or null`,
          });
          return;
        }

        data[field as "phone" | "checkInTime" | "checkOutTime" | "cancellationPolicy"] =
          value === null ? null : value.trim();
      }
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({
        success: false,
        message: "Provide at least one valid field to update",
      });
      return;
    }

    const branch = await prisma.hotelBranch.update({
      where: { id: req.params.id },
      data,
    });

    res.status(200).json({
      success: true,
      data: branch,
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
        message: "Hotel branch not found",
      });
      return;
    }

    console.error("Failed to update hotel branch:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update hotel branch",
    });
  }
});

// DELETE /api/v1/branches/:id
router.delete("/:id", async (req, res) => {
  try {
    const branch = await prisma.hotelBranch.delete({
      where: { id: req.params.id },
    });

    res.status(200).json({
      success: true,
      message: "Hotel branch deleted successfully",
      data: branch,
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
        message: "Hotel branch not found",
      });
      return;
    }

    console.error("Failed to delete hotel branch:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete hotel branch",
    });
  }
});

export default router;