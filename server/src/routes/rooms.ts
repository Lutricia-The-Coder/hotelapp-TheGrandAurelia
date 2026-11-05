import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const roomDetailsInclude = {
  roomTypeOption: true,
  amenities: {
    include: {
      amenity: true,
    },
  },
};

// GET /api/v1/rooms/branch/:branchId
router.get("/branch/:branchId", async (req, res) => {
  try {
    const branchId = req.params.branchId;

    if (typeof branchId !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid branch ID",
      });
      return;
    }

    const rooms = await prisma.roomType.findMany({
      where: { branchId },
      include: roomDetailsInclude,
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
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      roomTypeOptionId,
      description,
      capacity,
      pricePerNight,
      totalRooms,
      branchId,
      amenityIds,
    } = req.body;

    if (
      typeof roomTypeOptionId !== "string" ||
      !roomTypeOptionId.trim() ||
      typeof branchId !== "string" ||
      !branchId.trim() ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      typeof pricePerNight !== "number" ||
      !Number.isFinite(pricePerNight) ||
      pricePerNight < 0
    ) {
      res.status(400).json({
        success: false,
        message:
          "A room type option, branch, positive capacity and valid nightly price are required",
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
        message: "Total rooms must be a positive integer",
      });
      return;
    }

    if (
      !Array.isArray(amenityIds) ||
      !amenityIds.every((id: unknown) => typeof id === "string")
    ) {
      res.status(400).json({
        success: false,
        message: "Amenity IDs must be an array of IDs",
      });
      return;
    }

    const uniqueAmenityIds = [...new Set(amenityIds as string[])];

    if (uniqueAmenityIds.length !== amenityIds.length) {
      res.status(400).json({
        success: false,
        message: "Duplicate amenity IDs are not allowed",
      });
      return;
    }

    const [option, branch, amenities] = await Promise.all([
      prisma.roomTypeOption.findUnique({
        where: { id: roomTypeOptionId },
      }),
      prisma.hotelBranch.findUnique({
        where: { id: branchId },
      }),
      prisma.amenity.findMany({
        where: { id: { in: uniqueAmenityIds } },
        select: { id: true },
      }),
    ]);

    if (!option || !option.isActive) {
      res.status(400).json({
        success: false,
        message: "Select an active room type option",
      });
      return;
    }

    if (!branch) {
      res.status(404).json({
        success: false,
        message: "Branch not found",
      });
      return;
    }

    if (amenities.length !== uniqueAmenityIds.length) {
      res.status(400).json({
        success: false,
        message: "One or more selected amenities do not exist",
      });
      return;
    }

    const room = await prisma.roomType.create({
      data: {
        name: option.name,
        roomTypeOptionId: option.id,
        description: description ?? null,
        capacity,
        pricePerNight,
        totalRooms: totalRooms ?? 1,
        branchId,
        amenities: {
          create: uniqueAmenityIds.map((amenityId) => ({
            amenity: {
              connect: { id: amenityId },
            },
          })),
        },
      },
      include: roomDetailsInclude,
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
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const roomId = req.params.id;

  if (typeof roomId !== "string") {
    res.status(400).json({
      success: false,
      message: "Invalid room type ID",
    });
    return;
  }

  try {
    const {
      roomTypeOptionId,
      description,
      capacity,
      pricePerNight,
      totalRooms,
      amenityIds,
    } = req.body;

    const existingRoom = await prisma.roomType.findUnique({
      where: { id: roomId },
    });

    if (!existingRoom) {
      res.status(404).json({
        success: false,
        message: "Room type not found",
      });
      return;
    }

    let selectedOptionId = existingRoom.roomTypeOptionId;
    let selectedOptionName = existingRoom.name;

    if (roomTypeOptionId !== undefined) {
      if (
        typeof roomTypeOptionId !== "string" ||
        !roomTypeOptionId.trim()
      ) {
        res.status(400).json({
          success: false,
          message: "Select a valid room type option",
        });
        return;
      }

      const option = await prisma.roomTypeOption.findUnique({
        where: { id: roomTypeOptionId },
      });

      if (!option) {
        res.status(404).json({
          success: false,
          message: "Room type option not found",
        });
        return;
      }

      if (!option.isActive && option.id !== existingRoom.roomTypeOptionId) {
        res.status(400).json({
          success: false,
          message: "You cannot assign an inactive room type option",
        });
        return;
      }

      selectedOptionId = option.id;
      selectedOptionName = option.name;
    }

    const data: {
      name?: string;
      roomTypeOptionId?: string | null;
      description?: string | null;
      capacity?: number;
      pricePerNight?: number;
      totalRooms?: number;
    } = {};

    if (roomTypeOptionId !== undefined) {
      data.name = selectedOptionName;
      data.roomTypeOptionId = selectedOptionId;
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

      const existingBookings = await prisma.booking.findMany({
        where: {
          roomTypeId: roomId,
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
          checkOut: {
            gt: new Date(),
          },
        },
        select: {
          checkIn: true,
          checkOut: true,
          roomQuantity: true,
        },
      });

      const events: { time: number; change: number }[] = [];

      for (const booking of existingBookings) {
        events.push(
          {
            time: booking.checkIn.getTime(),
            change: booking.roomQuantity,
          },
          {
            time: booking.checkOut.getTime(),
            change: -booking.roomQuantity,
          },
        );
      }

      events.sort((a, b) => a.time - b.time);

      let currentRooms = 0;
      let maximumBookedRooms = 0;
      let index = 0;

      while (index < events.length) {
        const time = events[index].time;
        let change = 0;

        while (
          index < events.length &&
          events[index].time === time
        ) {
          change += events[index].change;
          index++;
        }

        currentRooms += change;
        maximumBookedRooms = Math.max(
          maximumBookedRooms,
          currentRooms,
        );
      }

      if (totalRooms < maximumBookedRooms) {
        res.status(409).json({
          success: false,
          message: `At least ${maximumBookedRooms} rooms are already reserved during overlapping dates. Inventory cannot be reduced below this quantity.`,
        });
        return;
      }

      data.totalRooms = totalRooms;
    }

    let uniqueAmenityIds: string[] | undefined;

    if (amenityIds !== undefined) {
      if (
        !Array.isArray(amenityIds) ||
        !amenityIds.every((id: unknown) => typeof id === "string")
      ) {
        res.status(400).json({
          success: false,
          message: "Amenity IDs must be an array of IDs",
        });
        return;
      }

      uniqueAmenityIds = [...new Set(amenityIds as string[])];

      if (uniqueAmenityIds.length !== amenityIds.length) {
        res.status(400).json({
          success: false,
          message: "Duplicate amenity IDs are not allowed",
        });
        return;
      }

      const amenities = await prisma.amenity.findMany({
        where: { id: { in: uniqueAmenityIds } },
        select: { id: true },
      });

      if (amenities.length !== uniqueAmenityIds.length) {
        res.status(400).json({
          success: false,
          message: "One or more selected amenities do not exist",
        });
        return;
      }
    }

    if (
      Object.keys(data).length === 0 &&
      uniqueAmenityIds === undefined
    ) {
      res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
      return;
    }

    const room = await prisma.$transaction(async (tx) => {
      await tx.roomType.update({
        where: { id: roomId },
        data,
      });

      if (uniqueAmenityIds !== undefined) {
        await tx.roomTypeAmenity.deleteMany({
          where: { roomTypeId: roomId },
        });

        if (uniqueAmenityIds.length > 0) {
          await tx.roomTypeAmenity.createMany({
            data: uniqueAmenityIds.map((amenityId) => ({
              roomTypeId: roomId,
              amenityId,
            })),
          });
        }
      }

      return tx.roomType.findUniqueOrThrow({
        where: { id: roomId },
        include: roomDetailsInclude,
      });
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

// GET /api/v1/rooms/:id/availability
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
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const roomId = req.params.id;

  if (typeof roomId !== "string") {
    res.status(400).json({
      success: false,
      message: "Invalid room type ID",
    });
    return;
  }

  try {
    const room = await prisma.roomType.delete({
      where: { id: roomId },
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

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2003"
    ) {
      res.status(409).json({
        success: false,
        message: "This room type cannot be deleted because it has reservations",
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