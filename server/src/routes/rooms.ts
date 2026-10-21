
import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

// GET /api/v1/rooms/branch/:branchId
router.get("/branch/:branchId", async (req, res) => {
  try {
    const rooms = await prisma.roomType.findMany({
      where: { branchId: req.params.branchId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  } catch (error) {
    console.error("Failed to fetch room types:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch room types",
    });
  }
});
// POST /api/v1/rooms
router.post("/", async (req, res) => {
  try {
    const { name, description, capacity, pricePerNight, totalRooms, branchId } =
      req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof capacity !== "number" ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      typeof pricePerNight !== "number" ||
      !Number.isFinite(pricePerNight) ||
      pricePerNight < 0 ||
      typeof branchId !== "string" ||
      !branchId.trim()
    ) {
      res.status(400).json({
        success: false,
        message:
          "Name, positive integer capacity, non-negative numeric pricePerNight, and branchId are required",
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

    if (
      totalRooms !== undefined &&
      (!Number.isInteger(totalRooms) || totalRooms < 1)
    ) {
      res.status(400).json({
        success: false,
        message: "totalRooms must be a positive integer",
      });
      return;
    }

    const room = await prisma.roomType.create({
      data: {
        name: name.trim(),
        description: description ?? null,
        capacity,
        pricePerNight,
        totalRooms: totalRooms ?? 1,
        branchId: branchId.trim(),
      },
    });

    res.status(201).json({
      success: true,
      data: room,
    });
  } catch (error) {
    console.error("Failed to create room type:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create room type",
    });
  }
});

export default router;
