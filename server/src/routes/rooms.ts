
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

// PUT /api/v1/rooms/:id
router.put("/:id", async (req, res) => {
  try {
    const {
      name,
      description,
      capacity,
      pricePerNight,
      totalRooms,
    } = req.body;

    const data: {
      name?: string;
      description?: string | null;
      capacity?: number;
      pricePerNight?: number;
      totalRooms?: number;
    } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({
          success: false,
          message: "Name must be a non-empty string",
        });
        return;
      }
      data.name = name.trim();
    }

    if (description !== undefined) {
      if (description !== null && typeof description !== "string") {
        res.status(400).json({
          success: false,
          message: "Description must be a string or null",
        });
        return;
      }
      data.description = description;
    }

    if (capacity !== undefined) {
      if (!Number.isInteger(capacity) || capacity < 1) {
        res.status(400).json({
          success: false,
          message: "Capacity must be a positive integer",
        });
        return;
      }
      data.capacity = capacity;
    }

    if (pricePerNight !== undefined) {
      if (
        typeof pricePerNight !== "number" ||
        !Number.isFinite(pricePerNight) ||
        pricePerNight < 0
      ) {
        res.status(400).json({
          success: false,
          message: "Price per night must be a non-negative number",
        });
        return;
      }
      data.pricePerNight = pricePerNight;
    }

    if (totalRooms !== undefined) {
      if (!Number.isInteger(totalRooms) || totalRooms < 1) {
        res.status(400).json({
          success: false,
          message: "Total rooms must be a positive integer",
        });
        return;
      }
      data.totalRooms = totalRooms;
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
      return;
    }

    const room = await prisma.roomType.update({
      where: { id: req.params.id },
      data,
    });

    res.status(200).json({
      success: true,
      data: room,
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
        message: "Room type not found",
      });
      return;
    }

    console.error("Failed to update room type:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update room type",
    });
  }
});

// GET /api/v1/rooms/:id/availability?checkIn=2026-11-01&checkOut=2026-11-03
router.get("/:id/availability", async (req, res) => {
  try {
    const { checkIn, checkOut } = req.query;

    if (
      typeof checkIn !== "string" ||
      typeof checkOut !== "string"
    ) {
      res.status(400).json({
        success: false,
        message: "checkIn and checkOut query parameters are required",
      });
      return;
    }

    const parsedCheckIn = new Date(checkIn);
    const parsedCheckOut = new Date(checkOut);

    if (
      Number.isNaN(parsedCheckIn.getTime()) ||
      Number.isNaN(parsedCheckOut.getTime()) ||
      parsedCheckOut <= parsedCheckIn
    ) {
      res.status(400).json({
        success: false,
        message: "Provide valid dates with checkOut later than checkIn",
      });
      return;
    }

    const room = await prisma.roomType.findUnique({
      where: { id: req.params.id },
    });

    if (!room) {
      res.status(404).json({
        success: false,
        message: "Room type not found",
      });
      return;
    }

    const overlappingBookings = await prisma.booking.aggregate({
      where: {
        roomTypeId: room.id,
        status: { in: ["PENDING", "CONFIRMED"] },
        checkIn: { lt: parsedCheckOut },
        checkOut: { gt: parsedCheckIn },
      },
      _sum: { roomQuantity: true },
    });

    const bookedRooms = overlappingBookings._sum.roomQuantity ?? 0;
    const availableRooms = Math.max(0, room.totalRooms - bookedRooms);

    res.status(200).json({
      success: true,
      data: {
        roomTypeId: room.id,
        totalRooms: room.totalRooms,
        bookedRooms,
        availableRooms,
        checkIn: parsedCheckIn,
        checkOut: parsedCheckOut,
        available: availableRooms > 0,
      },
    });
  } catch (error) {
    console.error("Failed to check room availability:", error);

    res.status(500).json({
      success: false,
      message: "Failed to check room availability",
    });
  }
});

// DELETE /api/v1/rooms/:id
router.delete("/:id", async (req, res) => {
  try {
    const room = await prisma.roomType.delete({
      where: { id: req.params.id },
    });

    res.status(200).json({
      success: true,
      message: "Room type deleted successfully",
      data: room,
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
        message: "Room type not found",
      });
      return;
    }

    console.error("Failed to delete room type:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete room type",
    });
  }
});

export default router;
