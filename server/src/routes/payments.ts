
import express, { Router } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import prisma from "../lib/prisma.js";
import { sendEmail } from "../lib/mailer.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

type PaystackTransaction = {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  metadata?: {
    paymentId?: string;
    bookingId?: string;
    userId?: string;
  } | null;
  customer?: {
    email?: string;
  };
};

async function findPaystackPayment(transaction: PaystackTransaction) {
  const metadata = transaction.metadata;
  const paymentId = metadata?.paymentId;
  const bookingId = metadata?.bookingId;
  const userId = metadata?.userId;

  if (!paymentId || !bookingId || !userId) {
    throw new Error("Paystack transaction is missing required metadata.");
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
    payment.provider !== "paystack" ||
    payment.providerPaymentId !== transaction.reference ||
    payment.bookingId !== bookingId ||
    payment.booking.userId !== userId
  ) {
    throw new Error("Paystack transaction does not match a valid payment.");
  }

  return payment;
}


async function processSuccessfulPayment(reference: string) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is missing.");
  }

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    },
  );

  const result = await response.json() as {
    status: boolean;
    message?: string;
    data?: PaystackTransaction;
  };

  if (!response.ok || !result.status || !result.data) {
    throw new Error(
      result.message || "Unable to verify Paystack transaction.",
    );
  }

  const transaction = result.data;

  if (
    transaction.status !== "success" ||
    transaction.reference !== reference
  ) {
    throw new Error("Paystack has not confirmed a successful payment.");
  }

  const payment = await findPaystackPayment(transaction);

  const expectedAmount = Math.round(Number(payment.amount) * 100);

  if (
    transaction.amount !== expectedAmount ||
    transaction.currency.toUpperCase() !== payment.currency.toUpperCase()
  ) {
    throw new Error(
      "Paystack payment amount or currency does not match the reservation.",
    );
  }

  const resultUpdate = await prisma.$transaction(async (tx) => {
    const paymentUpdate = await tx.payment.updateMany({
      where: {
        id: payment.id,
        status: "PENDING",
        providerPaymentId: reference,
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

  if (!resultUpdate.processed) {
    console.log("Paystack payment already processed:", reference);
    return;
  }

  if (!resultUpdate.bookingConfirmed) {
  console.warn(
    "Payment succeeded for a reservation that was already cancelled or changed:",
    payment.bookingId,
  );

  await requestPaystackRefund(payment.id, reference);
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


async function requestPaystackRefund(
  paymentId: string,
  reference: string,
): Promise<void> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is missing.");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (
    !payment ||
    payment.provider !== "paystack" ||
    payment.providerPaymentId !== reference
  ) {
    throw new Error("Payment does not match the Paystack transaction.");
  }

  if (payment.status === "REFUNDED") {
    return;
  }

  if (payment.status === "SUCCEEDED") {
    const claimed = await prisma.payment.updateMany({
      where: {
        id: paymentId,
        status: "SUCCEEDED",
        providerPaymentId: reference,
      },
      data: {
        status: "REFUND_PENDING",
        refundAttempt: { increment: 1 },
        providerRefundId: null,
      },
    });

    if (claimed.count !== 1) {
      throw new Error("Could not safely claim the refund request.");
    }
  } else if (payment.status !== "REFUND_PENDING") {
    throw new Error("Payment is not eligible for a refund.");
  } else if (payment.providerRefundId) {
    console.log("Paystack refund already submitted:", payment.providerRefundId);
    return;
  } else {
    throw new Error(
      "A refund request is already pending review. Do not submit another refund.",
    );
  }

  const currentPayment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!currentPayment) {
    throw new Error("Payment record not found.");
  }

  const response = await fetch("https://api.paystack.co/refund", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction: reference,
      customer_note: "Refund for cancelled hotel reservation.",
      merchant_note: `Booking ${payment.bookingId}`,
    }),
  });

  const result = await response.json() as {
    status: boolean;
    message?: string;
    data?: {
      id?: number;
      status?: string;
    };
  };

  if (!response.ok || !result.status || !result.data?.id) {
    if (response.status >= 400 && response.status < 500) {
      await prisma.payment.updateMany({
        where: {
          id: paymentId,
          status: "REFUND_PENDING",
          refundAttempt: currentPayment.refundAttempt,
        },
        data: {
          status: "SUCCEEDED",
        },
      });
    }

    throw new Error(result.message || "Unable to request Paystack refund.");
  }

  const saved = await prisma.payment.updateMany({
    where: {
      id: paymentId,
      status: "REFUND_PENDING",
      refundAttempt: currentPayment.refundAttempt,
    },
    data: {
      providerRefundId: String(result.data.id),
    },
  });

  if (saved.count !== 1) {
    throw new Error(
      "Paystack accepted the refund, but its reference could not be saved. Manual review is required.",
    );
  }

  console.log(
    "Paystack refund submitted:",
    result.data.id,
    "for booking:",
    payment.bookingId,
  );
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
      }

      const payment = await prisma.payment.findFirst({
        where: {
          bookingId,
          provider: "paystack",
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
          message: "Pending Paystack payment not found.",
        });
        return;
      }

      const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();

      if (!secretKey) {
        throw new Error("PAYSTACK_SECRET_KEY is missing.");
      }

      const verifyResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(payment.providerPaymentId)}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        },
      );

      const verifyResult = await verifyResponse.json() as {
        status: boolean;
        message?: string;
        data?: PaystackTransaction;
      };

      if (
        !verifyResponse.ok ||
        !verifyResult.status ||
        !verifyResult.data ||
        verifyResult.data.reference !== payment.providerPaymentId
      ) {
        throw new Error(
          verifyResult.message || "Unable to verify Paystack payment.",
        );
      }

      if (verifyResult.data.status === "success") {
        await processSuccessfulPayment(payment.providerPaymentId);

        res.status(409).json({
          success: false,
          message: "Payment has already succeeded. Please refresh your reservation.",
        });
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
        const bookingUpdate = await tx.booking.updateMany({
          where: {
            id: bookingId,
            userId: req.user!.id,
            status: "PENDING",
          },
          data: {
            status: "CANCELLED",
          },
        });

        if (bookingUpdate.count !== 1) {
          return false;
        }

        if (
          verifyResult.data!.status === "failed" ||
          verifyResult.data!.status === "abandoned"
        ) {
          await tx.payment.updateMany({
            where: {
              id: payment.id,
              status: "PENDING",
            },
            data: {
              status: "FAILED",
            },
          });
        }

        return true;
      });

      if (!result) {
        res.status(409).json({
          success: false,
          message: "The reservation has already changed. Refresh and try again.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Reservation cancelled successfully.",
        data: {
          reference: payment.providerPaymentId,
        },
      });
    } catch (error) {
      console.error("Failed to cancel Paystack checkout:", error);

      res.status(500).json({
        success: false,
        message: "Unable to cancel checkout.",
      });
    }
  },
);

router.get(
  "/reference/:reference",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const reference = req.params.reference;

      if (
        typeof reference !== "string" ||
        !/^[A-Za-z0-9=.-]{1,100}$/.test(reference)
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid Paystack transaction reference.",
        });
        return;
      }

      const payment = await prisma.payment.findFirst({
        where: {
          provider: "paystack",
          providerPaymentId: reference,
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
      console.error("Failed to retrieve Paystack payment status:", error);

      res.status(500).json({
        success: false,
        message: "Failed to retrieve payment status.",
      });
    }
  },
);

//get

async function reconcilePaystackRefund(
refund: PaystackTransaction & {
transaction_reference?: string;
refund_reference?: string | null;
},
): Promise<void> {
const reference = refund.transaction_reference;

if (!reference) {
throw new Error("Paystack refund event is missing its transaction reference.");
}

const payment = await prisma.payment.findFirst({
where: {
provider: "paystack",
providerPaymentId: reference,
},
});

if (!payment) {
throw new Error(`No payment found for Paystack refund: ${reference}`);
}

const expectedAmount = Math.round(Number(payment.amount) * 100);

if (
refund.amount !== expectedAmount ||
refund.currency?.toUpperCase() !== payment.currency.toUpperCase()
) {
throw new Error("Paystack refund amount or currency does not match the payment.");
}

switch (refund.status) {
case "pending":
case "processing":
case "needs-attention": {
console.log("Paystack refund is still being processed:", reference);
return;
}

case "processed": {
if (payment.status === "REFUNDED") {
return;
}

await prisma.$transaction(async (tx) => {
const updated = await tx.payment.updateMany({
where: {
id: payment.id,
status: "REFUND_PENDING",
},
data: {
status: "REFUNDED",
},
});

if (updated.count === 1) {
await tx.booking.updateMany({
where: {
id: payment.bookingId,
},
data: {
status: "CANCELLED",
},
});
}
});

console.log("Paystack refund processed:", reference);
return;
}

case "failed": {
await prisma.payment.updateMany({
where: {
id: payment.id,
status: "REFUND_PENDING",
},
data: {
status: "SUCCEEDED",
providerRefundId: null,
},
});

console.error(
"Paystack refund failed and needs review:",
reference,
"Booking:",
payment.bookingId,
);
return;
}

default:
console.log("Unhandled Paystack refund status:", refund.status);
}
}

// POST /api/v1/payments/webhook

// Its signature must be verified before processing.
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();

    if (!secretKey) {
      console.error("PAYSTACK_SECRET_KEY is missing.");
      res.status(500).json({
        success: false,
        message: "Webhook configuration is missing.",
      });
      return;
    }

    const signature = req.headers["x-paystack-signature"];

    if (
      typeof signature !== "string" ||
      !/^[a-f0-9]{128}$/i.test(signature) ||
      !Buffer.isBuffer(req.body)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid Paystack webhook request.",
      });
      return;
    }

    const expectedSignature = createHmac("sha512", secretKey)
      .update(req.body)
      .digest();

    const receivedSignature = Buffer.from(signature, "hex");

    if (
      receivedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(expectedSignature, receivedSignature)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid webhook signature.",
      });
      return;
    }

    try {
      const event = JSON.parse(req.body.toString("utf8")) as {
        event?: string;
        data?: PaystackTransaction & {
          transaction_reference?: string;
          refund_reference?: string | null;
        };
      };

      if (!event.event || !event.data) {
        res.status(400).json({
          success: false,
          message: "Invalid webhook payload.",
        });
        return;
      }

      switch (event.event) {
        case "charge.success": {
          if (event.data.reference) {
            await processSuccessfulPayment(event.data.reference);
          }
          break;
        }

        case "refund.pending":
        case "refund.processing":
        case "refund.needs-attention":
        case "refund.processed":
        case "refund.failed": {
          await reconcilePaystackRefund(event.data);
          break;
        }

        default:
          console.log("Unhandled Paystack event:", event.event);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Paystack webhook processing failed:", error);

      res.status(500).json({
        success: false,
        message: "Webhook processing failed.",
      });
    }
  },
);
export default router;
