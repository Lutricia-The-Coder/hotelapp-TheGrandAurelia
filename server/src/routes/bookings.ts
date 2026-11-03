
import { Router } from "express";
import prisma from "../lib/prisma.js";
import {
  requireAuth,
  requireAdmin,
  type AuthenticatedRequest,
} from "../middleware/auth.js";import { sendEmail } from "../lib/mailer.js";  

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


 // GET /api/v1/bookings/admin
router.get(
  "/admin",
  requireAuth,
  requireAdmin,
  async (_req, res) => {
    try {
      const bookings = await prisma.booking.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              title: true,
            },
          },
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
        orderBy: {
          createdAt: "desc",
        },
      });

      res.status(200).json({
        success: true,
        count: bookings.length,
        data: bookings,
      });
    } catch (error) {
      console.error("Failed to fetch admin bookings:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch reservations",
      });
    }
  },
);


// PATCH /api/v1/bookings/admin/:id/status
router.patch(
  "/admin/:id/status",
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const bookingId = req.params.id;
      const { status } = req.body ?? {};

      if (typeof bookingId !== "string") {
        res.status(400).json({
          success: false,
          message: "Invalid booking ID",
        });
        return;
      }

      if (status !== "CONFIRMED" && status !== "CANCELLED") {
        res.status(400).json({
          success: false,
          message: "Status must be CONFIRMED or CANCELLED",
        });
        return;
      }

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          payments: {
            select: {
              status: true,
            },
          },
        },
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
          message: `A ${booking.status.toLowerCase()} booking cannot be changed`,
        });
        return;
      }

      const hasSuccessfulPayment = booking.payments.some(
        (payment) => payment.status === "SUCCEEDED",
      );

      const hasPendingPayment = booking.payments.some(
        (payment) => payment.status === "PENDING",
      );

      if (status === "CONFIRMED" && !hasSuccessfulPayment) {
        res.status(409).json({
          success: false,
          message: "A reservation can only be confirmed after successful payment.",
        });
        return;
      }

      if (status === "CANCELLED" && hasSuccessfulPayment) {
        res.status(409).json({
          success: false,
          message: "This reservation has been paid. Process the refund before cancelling it.",
        });
        return;
      }

      if (status === "CANCELLED" && hasPendingPayment) {
        res.status(409).json({
          success: false,
          message: "This reservation has a pending payment. Expire its checkout before cancelling it.",
        });
        return;
      }

      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: { status },
      });

      res.status(200).json({
        success: true,
        message:
          status === "CONFIRMED"
            ? "Booking confirmed successfully"
            : "Booking cancelled successfully",
        data: updatedBooking,
      });
    } catch (error) {
      console.error("Failed to update booking status:", error);

      res.status(500).json({
        success: false,
        message: "Failed to update booking status",
      });
    }
  },
);
router.patch(
  "/admin/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const bookingId = req.params.id;
      const body = req.body ?? {};

      if (typeof bookingId !== "string") {
        res.status(400).json({
          success: false,
          message: "Invalid booking ID",
        });
        return;
      }

  const existing = await prisma.booking.findUnique({
  where: { id: bookingId },
  include: {
    payments: {
      select: {
        status: true,
      },
    },
  },
});

      if (!existing) {
        res.status(404).json({
          success: false,
          message: "Booking not found",
        });
        return;
      }
const hasProtectedPayment = existing.payments.some(
  (payment) =>
    payment.status === "PENDING" ||
    payment.status === "SUCCEEDED",
);

if (hasProtectedPayment) {
  res.status(409).json({
    success: false,
    message:
      "This reservation has a pending or successful payment. Payment adjustments must be handled before modifying it.",
  });
  return;
}
      if (
        existing.status === "CANCELLED" ||
        existing.status === "COMPLETED"
      ) {
        res.status(400).json({
          success: false,
          message: `A ${existing.status.toLowerCase()} booking cannot be modified`,
        });
        return;
      }

      const isDateOnly = (value: unknown): value is string => {
        if (
          typeof value !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(value)
        ) {
          return false;
        }

        const parsed = new Date(value);

        return (
          !Number.isNaN(parsed.getTime()) &&
          parsed.toISOString().slice(0, 10) === value
        );
      };

      const checkIn =
        body.checkIn === undefined
          ? existing.checkIn.toISOString().slice(0, 10)
          : body.checkIn;

      const checkOut =
        body.checkOut === undefined
          ? existing.checkOut.toISOString().slice(0, 10)
          : body.checkOut;

      const adults =
        body.adults === undefined ? existing.adults : body.adults;

      const children =
        body.children === undefined
          ? existing.children
          : body.children;

      const quantity =
        body.roomQuantity === undefined
          ? existing.roomQuantity
          : body.roomQuantity;

      if (
        !isDateOnly(checkIn) ||
        !isDateOnly(checkOut) ||
        new Date(checkOut) <= new Date(checkIn)
      ) {
        res.status(400).json({
          success: false,
          message: "Valid check-in and check-out dates are required",
        });
        return;
      }

      if (body.checkIn !== undefined) {
        const today = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Africa/Johannesburg",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());

        if (checkIn < today) {
          res.status(400).json({
            success: false,
            message: "Check-in date cannot be in the past",
          });
          return;
        }
      }

      if (
        !Number.isInteger(adults) ||
        adults < 1 ||
        !Number.isInteger(children) ||
        children < 0 ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid guest counts or room quantity",
        });
        return;
      }

      const room = await prisma.roomType.findUnique({
        where: { id: existing.roomTypeId },
      });

      if (!room) {
        res.status(404).json({
          success: false,
          message: "Room type not found",
        });
        return;
      }

      if (adults + children > room.capacity * quantity) {
        res.status(400).json({
          success: false,
          message: `This booking allows a maximum of ${room.capacity * quantity} guest(s).`,
        });
        return;
      }

      const parsedCheckIn = new Date(checkIn);
      const parsedCheckOut = new Date(checkOut);

      const overlappingBookings = await prisma.booking.findMany({
        where: {
          roomTypeId: room.id,
          id: { not: bookingId },
          status: { in: ["PENDING", "CONFIRMED"] },
          checkIn: { lt: parsedCheckOut },
          checkOut: { gt: parsedCheckIn },
        },
        select: {
          checkIn: true,
          checkOut: true,
          roomQuantity: true,
        },
      });

      const events: { time: number; change: number }[] = [];

      for (const booking of overlappingBookings) {
        const from = Math.max(
          booking.checkIn.getTime(),
          parsedCheckIn.getTime(),
        );

        const until = Math.min(
          booking.checkOut.getTime(),
          parsedCheckOut.getTime(),
        );

        if (from < until) {
          events.push(
            { time: from, change: booking.roomQuantity },
            { time: until, change: -booking.roomQuantity },
          );
        }
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

      const availableRooms = Math.max(
        0,
        room.totalRooms - maximumBookedRooms,
      );

      if (quantity > availableRooms) {
        res.status(409).json({
          success: false,
          message: `Only ${availableRooms} room(s) available for those dates.`,
        });
        return;
      }

      const nights = Math.round(
        (parsedCheckOut.getTime() - parsedCheckIn.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const totalPrice =
        Number(room.pricePerNight) * nights * quantity;

      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          checkIn: parsedCheckIn,
          checkOut: parsedCheckOut,
          adults,
          children,
          roomQuantity: quantity,
          totalPrice,
        },
      });

      try {
        const user = await prisma.user.findUnique({
          where: { id: existing.userId },
          select: { email: true, name: true },
        });

        if (user?.email) {
          await sendEmail({
            to: user.email,
            subject: "Your booking has been updated — The Grand Aurelia",
            text: [
              `Hello ${user.name || "Guest"},`,
              "",
              "Your reservation has been updated by our team.",
              `Booking reference: ${updatedBooking.id}`,
              `Check-in: ${checkIn}`,
              `Check-out: ${checkOut}`,
              `Rooms booked: ${quantity}`,
              `Adults: ${adults}`,
              `Children: ${children}`,
              `Updated total: ${totalPrice.toLocaleString("en-ZA", {
                style: "currency",
                currency: "ZAR",
              })}`,
            ].join("\n"),
          });
        }
      } catch (emailError) {
        console.error(
          "Booking was updated, but its notification email failed:",
          emailError,
        );
      }

      res.status(200).json({
        success: true,
        message: "Booking updated successfully",
        data: updatedBooking,
      });
    } catch (error) {
      console.error("Failed to modify booking:", error);

      res.status(500).json({
        success: false,
        message: "Failed to modify booking",
      });
    }
  },
);


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

   
const amountInCents = Math.round(totalPrice * 100);

if (!Number.isSafeInteger(amountInCents) || amountInCents < 50) {
  res.status(400).json({
    success: false,
    message: "Booking amount must be at least R0.50.",
  });
  return;
}

// Create the pending booking and payment together.
const { booking, payment } = await prisma.$transaction(async (tx) => {
  const booking = await tx.booking.create({
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

  const payment = await tx.payment.create({
    data: {
      amount: totalPrice,
      currency: "ZAR",
provider: "paystack",
      bookingId: booking.id,
    },
  });

  return { booking, payment };
});

try {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  const frontendUrl = process.env.FRONTEND_URL?.trim();

  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is missing.");
  }

  if (!frontendUrl) {
    throw new Error("FRONTEND_URL is missing.");
  }

  const reference = `GA-${payment.id}`;

  const paystackResponse = await fetch(
    "https://api.paystack.co/transaction/initialize",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountInCents,
        currency: "ZAR",
        reference,
        callback_url: `${frontendUrl.replace(/\/+$/, "")}/?payment=success`,
        metadata: {
          bookingId: booking.id,
          paymentId: payment.id,
          userId: user.id,
        },
      }),
    },
  );

  const paystackResult = await paystackResponse.json() as {
    status: boolean;
    message?: string;
    data?: {
      authorization_url?: string;
      reference?: string;
    };
  };

  if (
    !paystackResponse.ok ||
    !paystackResult.status ||
    !paystackResult.data?.authorization_url ||
    !paystackResult.data.reference
  ) {
    throw new Error(
      paystackResult.message || "Unable to initialize Paystack payment.",
    );
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerPaymentId: paystackResult.data.reference,
    },
  });

  res.status(201).json({
    success: true,
    message: "Booking created. Continue to secure payment.",
    data: booking,
    checkoutUrl: paystackResult.data.authorization_url,
    paymentId: payment.id,
  });
} catch (paystackError) {
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });

    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
    });
  });

  throw paystackError;
}

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
