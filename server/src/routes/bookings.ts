
import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

// GET /api/v1/bookings/user/:userId
router.get(
  "/user/:userId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {  try {
    const bookings = await prisma.booking.findMany({
where: { userId: req.user!.id },      include: {
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
router.post(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {  try {
const {
  checkIn,
  checkOut,
  adults,
  children,
  roomQuantity,
  roomTypeId,
} = req.body;
    if (
      typeof checkIn !== "string" ||
      typeof checkOut !== "string" ||
      typeof roomTypeId !== "string" ||
      !roomTypeId.trim()
    ) {
      res.status(400).json({
        success: false,
        message: "Valid checkIn, checkOut, and roomTypeId are required",
      });
      return;
    }
    // Validate check-in and check-out dates
    
    const todayInSouthAfrica = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Johannesburg",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    if (checkIn.slice(0, 10) < todayInSouthAfrica) {
      res.status(400).json({
        success: false,
        message: "Check-in date cannot be in the past",
      });
      return;
    }


    const parsedCheckIn = new Date(checkIn);
    const parsedCheckOut = new Date(checkOut);
// Validate date formats and ensure check-out is after check-in
 
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(checkIn) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(checkOut) ||
      Number.isNaN(parsedCheckIn.getTime()) ||
      Number.isNaN(parsedCheckOut.getTime()) ||
      parsedCheckIn.toISOString().slice(0, 10) !== checkIn ||
      parsedCheckOut.toISOString().slice(0, 10) !== checkOut ||
      parsedCheckOut <= parsedCheckIn
    ) {
      res.status(400).json({
        success: false,
        message:
          "Check-in and check-out must be valid dates in YYYY-MM-DD format, and check-out must be later than check-in.",
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
// Check if the requested room quantity exceeds the total available rooms

    if (guestAdults + guestChildren > room.capacity * quantity) {
      res.status(400).json({
        success: false,
        message: `This booking allows a maximum of ${room.capacity * quantity} guest(s) for the selected room quantity.`,
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

    const overlappingBookings = await prisma.booking.findMany({
      where: {
        roomTypeId: room.id,
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
        checkIn: {
          lt: parsedCheckOut,
        },
        checkOut: {
          gt: parsedCheckIn,
        },
      },
      select: {
        checkIn: true,
        checkOut: true,
        roomQuantity: true,
      },
    });

    const events: { time: number; change: number }[] = [];

    for (const booking of overlappingBookings) {
      const occupiedFrom = Math.max(
        booking.checkIn.getTime(),
        parsedCheckIn.getTime(),
      );

      const occupiedUntil = Math.min(
        booking.checkOut.getTime(),
        parsedCheckOut.getTime(),
      );

      if (occupiedFrom < occupiedUntil) {
        events.push({
          time: occupiedFrom,
          change: booking.roomQuantity,
        });

        events.push({
          time: occupiedUntil,
          change: -booking.roomQuantity,
        });
      }
    }

    events.sort((a, b) => a.time - b.time);

    let currentBookedRooms = 0;
    let maxBookedRooms = 0;
    let index = 0;

    while (index < events.length) {
      const currentTime = events[index].time;
      let changeAtTime = 0;

      while (
        index < events.length &&
        events[index].time === currentTime
      ) {
        changeAtTime += events[index].change;
        index++;
      }

      currentBookedRooms += changeAtTime;

      maxBookedRooms = Math.max(
        maxBookedRooms,
        currentBookedRooms,
      );
    }

    const availableRooms = room.totalRooms - maxBookedRooms;


    if (quantity > availableRooms) {
      res.status(409).json({
        success: false,
        message: `Only ${Math.max(0, availableRooms)} room(s) available for those dates.`,
      });
      return;
    }

   const user = await prisma.user.findUnique({
  where: { id: req.user!.id },
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
router.patch(
  "/:id/cancel",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
  try {
   const bookingId = req.params.id;

if (typeof bookingId !== "string") {
  res.status(400).json({
    success: false,
    message: "Invalid booking ID",
  });
  return;
}

const booking = await prisma.booking.findUnique({
  where: { id: bookingId },
});

    if (!booking) {
      res.status(404).json({
        success: false,
        message: "Booking not found",
      });
      return;
    }
if (booking.userId !== req.user!.id) {
  res.status(403).json({
    success: false,
    message: "You are not allowed to cancel this booking",
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
  where: {
    id: booking.id,
    userId: req.user!.id,
  },
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
