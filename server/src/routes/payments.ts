
import express, { Router } from "express";
import type Stripe from "stripe";
import prisma from "../lib/prisma.js";
import { getStripeClient } from "../lib/stripe.js";
import { sendEmail } from "../lib/mailer.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

async function findCheckoutPayment(session: Stripe.Checkout.Session) {
  const paymentId = session.metadata?.paymentId;
  const bookingId = session.metadata?.bookingId;
  const userId = session.metadata?.userId;

  if (!paymentId || !bookingId || !userId) {
    throw new Error("Checkout session is missing required metadata.");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      booking: {
        include: {
          user: true,
          roomType: true,
        },
      },
    },
  });

  if (
    !payment ||
    payment.provider !== "stripe" ||
    payment.providerPaymentId !== session.id ||
    payment.bookingId !== bookingId ||
    payment.booking.userId !== userId
  ) {
    throw new Error("Checkout session does not match a valid payment.");
  }

  return payment;
}

async function processSuccessfulPayment(
  session: Stripe.Checkout.Session,
) {
  if (session.mode !== "payment" || session.payment_status !== "paid") {
    return;
  }

  const payment = await findCheckoutPayment(session);

  const expectedAmount = Math.round(Number(payment.amount) * 100);

  if (
    session.amount_total !== expectedAmount ||
    session.currency?.toUpperCase() !== payment.currency.toUpperCase() ||
    session.client_reference_id !== payment.bookingId
  ) {
    throw new Error("Stripe payment amount or currency does not match the booking.");
  }

  // updateMany makes repeated webhook deliveries idempotent.
  const result = await prisma.$transaction(async (tx) => {
    const paymentUpdate = await tx.payment.updateMany({
      where: {
        id: payment.id,
        status: "PENDING",
        providerPaymentId: session.id,
      },
      data: {
        status: "SUCCEEDED",
      },
    });

    if (paymentUpdate.count !== 1) {
      return {
        processed: false,
        bookingConfirmed: false,
      };
    }

    const bookingUpdate = await tx.booking.updateMany({
      where: {
        id: payment.bookingId,
        status: "PENDING",
      },
      data: {
        status: "CONFIRMED",
      },
    });

    return {
      processed: true,
      bookingConfirmed: bookingUpdate.count === 1,
    };
  });

  if (!result.processed) {
    console.log("Stripe webhook already processed:", session.id);
    return;
  }

  if (!result.bookingConfirmed) {
    console.warn(
      "Payment succeeded, but the booking was not pending:",
      payment.bookingId,
    );
    return;
  }

  try {
    await sendEmail({
      to: payment.booking.user.email,
      subject: "Payment confirmed — The Grand Aurelia",
      text: [
        `Hello ${payment.booking.user.name || "Guest"},`,
        "",
        "Your payment was successfully received.",
        "",
        `Booking reference: ${payment.bookingId}`,
        `Room: ${payment.booking.roomType.name}`,
        `Check-in: ${payment.booking.checkIn.toISOString().slice(0, 10)}`,
        `Check-out: ${payment.booking.checkOut.toISOString().slice(0, 10)}`,
        `Total paid: ${Number(payment.amount).toLocaleString("en-ZA", {
          style: "currency",
          currency: "ZAR",
        })}`,
        "",
        "Your reservation is confirmed. We look forward to welcoming you!",
      ].join("\n"),
    });

    console.log("Payment confirmation email sent:", payment.bookingId);
  } catch (emailError) {
    console.error(
      "Payment succeeded, but confirmation email failed:",
      emailError,
    );
  }
}

async function processFailedPayment(
  session: Stripe.Checkout.Session,
) {
  const payment = await findCheckoutPayment(session);

  await prisma.$transaction(async (tx) => {
    const paymentUpdate = await tx.payment.updateMany({
      where: {
        id: payment.id,
        status: "PENDING",
        providerPaymentId: session.id,
      },
      data: {
        status: "FAILED",
      },
    });

    if (paymentUpdate.count === 1) {
      await tx.booking.updateMany({
        where: {
          id: payment.bookingId,
          status: "PENDING",
        },
        data: {
          status: "CANCELLED",
        },
      });
    }
  });

  console.log("Unsuccessful Stripe checkout processed:", session.id);
}


router.post(
  "/bookings/:bookingId/cancel-checkout",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
  const bookingId = req.params.bookingId;

if (
  typeof bookingId !== "string" ||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    bookingId,
  )
) {
  res.status(400).json({
    success: false,
    message: "Invalid booking ID.",
  });
  return;
};

      const payment = await prisma.payment.findFirst({
        where: {
          bookingId,
          provider: "stripe",
          status: "PENDING",
          booking: {
            is: {
              userId: req.user!.id,
              status: "PENDING",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!payment?.providerPaymentId) {
        res.status(404).json({
          success: false,
          message: "Pending checkout not found.",
        });
        return;
      }

      const stripe = getStripeClient();

      let session = await stripe.checkout.sessions.retrieve(
        payment.providerPaymentId,
      );

      if (session.status === "complete" || session.payment_status === "paid") {
        res.status(409).json({
          success: false,
          message: "Payment has already been completed or is processing.",
        });
        return;
      }

      if (session.status === "open") {
        session = await stripe.checkout.sessions.expire(session.id);
      }

      if (session.status !== "expired") {
        res.status(409).json({
          success: false,
          message: "Checkout could not be expired.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Checkout expired successfully.",
        data: {
          sessionId: session.id,
        },
      });
    } catch (error) {
      console.error("Failed to cancel Stripe checkout:", error);

      res.status(500).json({
        success: false,
        message: "Unable to cancel checkout.",
      });
    }
  },
);

//get

router.get(
  "/session/:sessionId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const sessionId = req.params.sessionId;

      if (
        typeof sessionId !== "string" ||
        !sessionId.startsWith("cs_")
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid checkout session ID.",
        });
        return;
      }

      const payment = await prisma.payment.findFirst({
        where: {
          provider: "stripe",
          providerPaymentId: sessionId,
          booking: {
            is: {
              userId: req.user!.id,
            },
          },
        },
        select: {
          status: true,
          amount: true,
          currency: true,
          booking: {
            select: {
              id: true,
              checkIn: true,
              checkOut: true,
              totalPrice: true,
              roomTypeId: true,
              userId: true,
              status: true,
            },
          },
        },
      });

      if (!payment) {
        res.status(404).json({
          success: false,
          message: "Payment not found for this account.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          paymentStatus: payment.status,
          booking: {
            ...payment.booking,
            totalPrice: payment.booking.totalPrice.toString(),
          },
        },
      });
    } catch (error) {
      console.error("Failed to retrieve payment status:", error);

      res.status(500).json({
        success: false,
        message: "Failed to retrieve payment status.",
      });
    }
  },
);


// POST /api/v1/payments/webhook
// Stripe sends this request without user authentication.
// Its signature must be verified before processing.
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is missing.");
      res.status(500).json({
        success: false,
        message: "Webhook configuration is missing.",
      });
      return;
    }

    const signature = req.headers["stripe-signature"];

    if (
      typeof signature !== "string" ||
      !Buffer.isBuffer(req.body)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid Stripe webhook request.",
      });
      return;
    }

    let event: Stripe.Event;

    try {
      event = getStripeClient().webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret,
      );
    } catch (error) {
      console.error("Stripe webhook signature verification failed:", error);

      res.status(400).json({
        success: false,
        message: "Invalid webhook signature.",
      });
      return;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed":
        case "checkout.session.async_payment_succeeded": {
          const session = event.data.object as Stripe.Checkout.Session;

          // Delayed payment methods can complete Checkout before funds arrive.
          if (session.payment_status === "paid") {
            await processSuccessfulPayment(session);
          }

          break;
        }

        case "checkout.session.async_payment_failed":
        case "checkout.session.expired": {
          const session = event.data.object as Stripe.Checkout.Session;
          await processFailedPayment(session);
          break;
        }

        default:
          console.log("Unhandled Stripe event:", event.type);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Stripe webhook processing failed:", error);

      // A 500 response tells Stripe to retry the event.
      res.status(500).json({
        success: false,
        message: "Webhook processing failed.",
      });
    }
  },
);

export default router;
