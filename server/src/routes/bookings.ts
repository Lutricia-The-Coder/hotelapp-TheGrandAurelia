
import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

// GET /api/v1/bookings/user/:userId
router.get("/user/:userId", async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.params.userId },
      include: {
        roomType: {
          include: {
            branch: {
              include: {
                hotel: true,
              },
            },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Failed to fetch bookings:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
});

// POST /api/v1/bookings
router.post("/", async (req, res) => {
  try {
    const {
      checkIn,
      checkOut,
      adults,
      children,
      roomQuantity,
      roomTypeId,
      userId,
    } = req.body;

    if (
      typeof checkIn !== "string" ||
      typeof checkOut !== "string" ||
      typeof roomTypeId !== "string" ||
      !roomTypeId.trim() ||
      typeof userId !== "string" ||
      !userId.trim()
    ) {
      res.status(400).json({
        success: false,
        message: "Valid checkIn, checkOut, roomTypeId, and userId are required",
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
        message: "Check-out must be later than a valid check-in date",
      });
      return;
    }

    const guestAdults = adults ?? 1;
    const guestChildren = children ?? 0;
    const quantity = roomQuantity ?? 1;

    if (
      !Number.isInteger(guestAdults) ||
      guestAdults < 1 ||
      !Number.isInteger(guestChildren) ||
      guestChildren < 0 ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      res.status(400).json({
        success: false,
        message: "Adults and room quantity must be positive integers; children must be a non-negative integer",
      });
      return;
    }

    const room = await prisma.roomType.findUnique({
      where: { id: roomTypeId.trim() },
    });

    if (!room) {
      res.status(404).json({
        success: false,
        message: "Room type not found",
      });
      return;
    }

    if (quantity > room.totalRooms) {
      res.status(400).json({
        success: false,
        message: "Requested room quantity exceeds the room type inventory",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId.trim() },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const nights = Math.ceil(
      (parsedCheckOut.getTime() - parsedCheckIn.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const totalPrice = Number(room.pricePerNight) * nights * quantity;

    const booking = await prisma.booking.create({
      data: {
        checkIn: parsedCheckIn,
        checkOut: parsedCheckOut,
        adults: guestAdults,
        children: guestChildren,
        roomQuantity: quantity,
        totalPrice,
        roomTypeId: room.id,
        userId: user.id,
      },
    });

    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("Failed to create booking:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create booking",
    });
  }
});

// PATCH /api/v1/bookings/:id/cancel
router.patch("/:id/cancel", async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });

    if (!booking) {
      res.status(404).json({
        success: false,
        message: "Booking not found",
      });
      return;
    }

    if (
      booking.status === "CANCELLED" ||
      booking.status === "COMPLETED"
    ) {
      res.status(400).json({
        success: false,
        message: `A ${booking.status.toLowerCase()} booking cannot be cancelled`,
      });
      return;
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
    });

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: updatedBooking,
    });
  } catch (error) {
    console.error("Failed to cancel booking:", error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
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

export default router;
