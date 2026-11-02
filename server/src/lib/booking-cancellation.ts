
import type Stripe from "stripe";
import type { Payment } from "@prisma/client";
import prisma from "./prisma.js";
import { getStripeClient } from "./stripe.js";

export class BookingCancellationError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "BookingCancellationError";
  }
}

export type CancellationOutcome = {
  bookingId: string;
  bookingStatus: string;
  paymentStatus: string | null;
  refundPending: boolean;
  message: string;
};

type CancellationPayment = Pick<
  Payment,
  | "id"
  | "bookingId"
  | "provider"
  | "status"
  | "amount"
  | "currency"
  | "providerPaymentId"
  | "providerPaymentIntentId"
  | "providerRefundId"
  | "refundAttempt"
>;

type CancellationBooking = {
  id: string;
  userId: string;
};

type RefundBookingData = CancellationPayment & CancellationBooking;

function paymentIntentIdFromSession(
  session: Stripe.Checkout.Session,
): string | null {
  const intent = session.payment_intent;

  if (typeof intent === "string") {
    return intent;
  }

  if (intent && typeof intent === "object") {
    return intent.id;
  }

  return null;
}

function validateCheckoutSession(
  session: Stripe.Checkout.Session,
  payment: RefundBookingData,
): void {
  if (
    session.mode !== "payment" ||
    session.id !== payment.providerPaymentId ||
    session.metadata?.paymentId !== payment.id ||
    session.metadata?.bookingId !== payment.bookingId ||
    session.metadata?.userId !== payment.userId ||
    session.client_reference_id !== payment.bookingId
  ) {
    throw new BookingCancellationError(
      "The Stripe checkout session does not match this reservation.",
      409,
    );
  }

  if (session.payment_status === "paid") {
    const expectedAmount = Math.round(
      Number(payment.amount) * 100,
    );

    if (
      session.amount_total !== expectedAmount ||
      session.currency?.toUpperCase() !==
        payment.currency.toUpperCase()
    ) {
      throw new BookingCancellationError(
        "The Stripe payment amount or currency does not match the reservation.",
        409,
      );
    }
  }
}

async function getValidatedSession(
  payment: RefundBookingData,
): Promise<Stripe.Checkout.Session> {
  if (!payment.providerPaymentId) {
    throw new BookingCancellationError(
      "The Stripe checkout session ID is missing. The reservation requires manual review.",
      409,
    );
  }

  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.retrieve(
    payment.providerPaymentId,
    {
      expand: ["payment_intent"],
    },
  );

  validateCheckoutSession(session, payment);

  return session;
}

async function getValidatedPaymentIntent(
  payment: RefundBookingData,
): Promise<string> {
  const stripe = getStripeClient();

  const session = await getValidatedSession(payment);

  if (session.payment_status !== "paid") {
    throw new BookingCancellationError(
      "Stripe has not confirmed this payment. Cancellation cannot continue yet.",
      409,
    );
  }

  const intentReference = session.payment_intent;

  if (!intentReference) {
    throw new BookingCancellationError(
      "Stripe did not return a PaymentIntent for this paid reservation.",
      409,
    );
  }

  const intent =
    typeof intentReference === "string"
      ? await stripe.paymentIntents.retrieve(intentReference)
      : intentReference;

  if (
    payment.providerPaymentIntentId &&
    payment.providerPaymentIntentId !== intent.id
  ) {
    throw new BookingCancellationError(
      "The stored PaymentIntent does not match the Checkout Session.",
      409,
    );
  }

  const expectedAmount = Math.round(
    Number(payment.amount) * 100,
  );

  if (
    intent.status !== "succeeded" ||
    intent.amount_received !== expectedAmount ||
    intent.currency.toUpperCase() !==
      payment.currency.toUpperCase() ||
    intent.metadata.paymentId !== payment.id ||
    intent.metadata.bookingId !== payment.bookingId ||
    intent.metadata.userId !== payment.userId
  ) {
    throw new BookingCancellationError(
      "The Stripe PaymentIntent does not match the verified reservation payment.",
      409,
    );
  }

  await prisma.payment.updateMany({
    where: {
      id: payment.id,
      status: {
        in: ["SUCCEEDED", "REFUND_PENDING"],
      },
    },
    data: {
      providerPaymentIntentId: intent.id,
    },
  });

  return intent.id;
}

async function getBookingResult(
  bookingId: string,
  paymentStatus: string | null,
  refundPending: boolean,
  message: string,
): Promise<CancellationOutcome> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!booking) {
    throw new BookingCancellationError(
      "Reservation not found.",
      404,
    );
  }

  return {
    bookingId: booking.id,
    bookingStatus: booking.status,
    paymentStatus,
    refundPending,
    message,
  };
}

async function cancelWithoutRefund(
  bookingId: string,
  paymentStatus: string | null,
): Promise<CancellationOutcome> {
  await prisma.$transaction(async (tx) => {
    const result = await tx.booking.updateMany({
      where: {
        id: bookingId,
        status: {
          in: ["PENDING", "CONFIRMED", "CANCELLED"],
        },
      },
      data: {
        status: "CANCELLED",
      },
    });

    if (result.count !== 1) {
      const existing = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { status: true },
      });

      if (existing?.status !== "CANCELLED") {
        throw new BookingCancellationError(
          "The reservation could not be cancelled.",
          409,
        );
      }
    }
  });

  return getBookingResult(
    bookingId,
    paymentStatus,
    false,
    "Reservation cancelled successfully.",
  );
}

async function finishSuccessfulRefund(
  paymentId: string,
  bookingId: string,
  attempt: number,
  refundId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const paymentUpdate = await tx.payment.updateMany({
      where: {
        id: paymentId,
        status: "REFUND_PENDING",
        refundAttempt: attempt,
      },
      data: {
        status: "REFUNDED",
        providerRefundId: refundId,
      },
    });

    if (paymentUpdate.count !== 1) {
      const currentPayment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: { status: true },
      });

      if (currentPayment?.status !== "REFUNDED") {
        throw new BookingCancellationError(
          "The refund state changed while it was being processed. Refresh the reservation before retrying.",
          409,
        );
      }
    }

    const bookingUpdate = await tx.booking.updateMany({
      where: {
        id: bookingId,
        status: {
          in: ["PENDING", "CONFIRMED", "CANCELLED"],
        },
      },
      data: {
        status: "CANCELLED",
      },
    });

    if (bookingUpdate.count !== 1) {
      const currentBooking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { status: true },
      });

      if (currentBooking?.status !== "CANCELLED") {
        throw new BookingCancellationError(
          "The refund succeeded, but the reservation could not be updated. Please contact support.",
          409,
        );
      }
    }
  });
}

async function findExistingRefund(
  payment: CancellationPayment,
  paymentIntentId: string,
  attempt: number,
): Promise<Stripe.Refund | null> {
  const stripe = getStripeClient();

  const refunds = await stripe.refunds.list({
    payment_intent: paymentIntentId,
    limit: 100,
  });

 return (
  refunds.data.find((refund) => {
    const metadata = refund.metadata;

    return (
      metadata?.paymentId === payment.id &&
      metadata?.bookingId === payment.bookingId &&
      metadata?.refundAttempt === String(attempt)
    );
  }) ?? null
);
}

async function requestStripeRefund(
  payment: CancellationPayment,
  paymentIntentId: string,
): Promise<CancellationOutcome> {
  const stripe = getStripeClient();

  let current = await prisma.payment.findUnique({
    where: { id: payment.id },
  });

  if (!current) {
    throw new BookingCancellationError(
      "Payment record not found.",
      404,
    );
  }

  if (current.status === "REFUNDED") {
    return getBookingResult(
      current.bookingId,
      "REFUNDED",
      false,
      "This reservation has already been refunded.",
    );
  }

  // Claim the refund attempt. Concurrent requests can only
  // increment this counter once for a given successful payment.
  if (current.status === "SUCCEEDED") {
    await prisma.payment.updateMany({
      where: {
        id: current.id,
        status: "SUCCEEDED",
        refundAttempt: current.refundAttempt,
      },
      data: {
        status: "REFUND_PENDING",
        refundAttempt: {
          increment: 1,
        },
        providerRefundId: null,
      },
    });

    current = await prisma.payment.findUnique({
      where: { id: payment.id },
    });

    if (!current) {
      throw new BookingCancellationError(
        "Payment record not found.",
        404,
      );
    }
  }

  if (current.status === "REFUNDED") {
    return getBookingResult(
      current.bookingId,
      "REFUNDED",
      false,
      "This reservation has already been refunded.",
    );
  }

  if (current.status !== "REFUND_PENDING") {
    throw new BookingCancellationError(
      "This payment is not eligible for a refund request.",
      409,
    );
  }

  const attempt = current.refundAttempt;

  // Reuse an already-recorded refund if one exists.

  let refund: Stripe.Refund | null = current.providerRefundId
    ? await stripe.refunds.retrieve(current.providerRefundId)
    : await findExistingRefund(
        payment,
        paymentIntentId,
        attempt,
      );

  if (!refund) {
    refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        reason: "requested_by_customer",
        metadata: {
          paymentId: current.id,
          bookingId: current.bookingId,
          refundAttempt: String(attempt),
        },
      },
      {
        idempotencyKey:
          `booking-refund-${current.id}-${attempt}`,
      },
    );
  }

  const returnedPaymentIntent =
    typeof refund.payment_intent === "string"
      ? refund.payment_intent
      : refund.payment_intent?.id;

  if (
    returnedPaymentIntent &&
    returnedPaymentIntent !== paymentIntentId
  ) {
    throw new BookingCancellationError(
      "Stripe returned a refund for a different payment.",
      409,
    );
  }

 const refundMetadata = refund.metadata;

if (
  !refundMetadata ||
  refundMetadata.paymentId !== current.id ||
  refundMetadata.bookingId !== current.bookingId ||
  refundMetadata.refundAttempt !== String(attempt)
) {
    throw new BookingCancellationError(
      "The Stripe refund metadata does not match this reservation.",
      409,
    );
  }

  // Store the refund ID immediately. If a later database operation
  // fails, subsequent requests can retrieve the same Stripe refund.
  const refundSaved = await prisma.payment.updateMany({
    where: {
      id: current.id,
      status: "REFUND_PENDING",
      refundAttempt: attempt,
    },
    data: {
      providerRefundId: refund.id,
    },
  });

  if (refundSaved.count !== 1) {
    const latestPayment = await prisma.payment.findUnique({
      where: { id: current.id },
    });

    if (latestPayment?.status === "REFUNDED") {
      return getBookingResult(
        current.bookingId,
        "REFUNDED",
        false,
        "Payment refunded and reservation cancelled successfully.",
      );
    }

    throw new BookingCancellationError(
      "The refund was created, but its database record could not be updated. Please retry or contact support.",
      409,
    );
  }

  if (refund.status === "succeeded") {
    await finishSuccessfulRefund(
      current.id,
      current.bookingId,
      attempt,
      refund.id,
    );

    return getBookingResult(
      current.bookingId,
      "REFUNDED",
      false,
      "Payment refunded and reservation cancelled successfully.",
    );
  }

  if (
    refund.status === "failed" ||
    refund.status === "canceled"
  ) {
    await prisma.payment.updateMany({
      where: {
        id: current.id,
        status: "REFUND_PENDING",
        refundAttempt: attempt,
        providerRefundId: refund.id,
      },
      data: {
        status: "SUCCEEDED",
        providerRefundId: null,
      },
    });

    throw new BookingCancellationError(
      "Stripe could not complete the refund. The reservation has not been cancelled. Please retry or contact support.",
      502,
    );
  }

  return getBookingResult(
    current.bookingId,
    "REFUND_PENDING",
    true,
    "Your refund has been requested and is still processing. The reservation will be cancelled after Stripe confirms the refund.",
  );
}

export async function cancelBookingSafely(
  bookingId: string,
  requestingUserId?: string,
): Promise<CancellationOutcome> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      payments: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!booking) {
    throw new BookingCancellationError(
      "Reservation not found.",
      404,
    );
  }

  if (
    requestingUserId &&
    booking.userId !== requestingUserId
  ) {
    throw new BookingCancellationError(
      "You are not allowed to cancel this reservation.",
      403,
    );
  }

  if (booking.status === "COMPLETED") {
    throw new BookingCancellationError(
      "A completed reservation cannot be cancelled.",
      400,
    );
  }

  // Ignore failed attempts. Multiple non-failed payments for one
  // booking are ambiguous and require manual investigation.
  const activePayments = booking.payments.filter(
    (payment) => payment.status !== "FAILED",
  );

  if (activePayments.length > 1) {
    throw new BookingCancellationError(
      "This reservation has multiple active payment records and requires manual review.",
      409,
    );
  }

  const payment = activePayments[0];

  if (!payment) {
    const failedPayment = booking.payments[0];

    return cancelWithoutRefund(
      bookingId,
      failedPayment?.status ?? null,
    );
  }

  if (payment.provider !== "stripe") {
    throw new BookingCancellationError(
      "This reservation uses an unsupported payment provider. Contact support.",
      409,
    );
  }

  if (payment.status === "REFUNDED") {
    await prisma.booking.updateMany({
      where: {
        id: bookingId,
        status: {
          in: ["PENDING", "CONFIRMED", "CANCELLED"],
        },
      },
      data: {
        status: "CANCELLED",
      },
    });

    return getBookingResult(
      bookingId,
      "REFUNDED",
      false,
      "This reservation has already been refunded and cancelled.",
    );
  }

  if (payment.status === "FAILED") {
    return cancelWithoutRefund(
      bookingId,
      "FAILED",
    );
  }

  const paymentData: RefundBookingData = {
    id: payment.id,
    bookingId: payment.bookingId,
    userId: booking.userId,
    provider: payment.provider,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    providerPaymentId: payment.providerPaymentId,
    providerPaymentIntentId:
      payment.providerPaymentIntentId,
    providerRefundId: payment.providerRefundId,
    refundAttempt: payment.refundAttempt,
  };

  const stripe = getStripeClient();

  if (payment.status === "PENDING") {
    const session = await getValidatedSession(paymentData);

    if (session.payment_status === "paid") {
      const paymentIntentId =
        await getValidatedPaymentIntent(paymentData);

      await prisma.payment.updateMany({
        where: {
          id: payment.id,
          status: "PENDING",
        },
        data: {
          status: "SUCCEEDED",
          providerPaymentIntentId: paymentIntentId,
        },
      });

    } else {
      let latestSession = session;

      if (session.status === "open") {
        try {
          latestSession =
            await stripe.checkout.sessions.expire(session.id);
        } catch {
          // Checkout may have completed between retrieval and
          // expiration. Retrieve its current state before proceeding.
          latestSession = await getValidatedSession(paymentData);
        }
      }

      if (latestSession.payment_status === "paid") {
        const paymentIntentId =
          await getValidatedPaymentIntent(paymentData);

        await prisma.payment.updateMany({
          where: {
            id: payment.id,
            status: "PENDING",
          },
          data: {
            status: "SUCCEEDED",
            providerPaymentIntentId: paymentIntentId,
          },
        });

      } else if (latestSession.status === "expired") {
        const failedUpdate = await prisma.payment.updateMany({
          where: {
            id: payment.id,
            status: "PENDING",
          },
          data: {
            status: "FAILED",
          },
        });

        if (failedUpdate.count === 1) {
          return cancelWithoutRefund(
            bookingId,
            "FAILED",
          );
        }

      } else {
        throw new BookingCancellationError(
          "Checkout is still active or payment is processing. Refresh the reservation and try again.",
          409,
        );
      }
    }
  }

  // Reload the payment because the Checkout Session may have
  // confirmed payment during the cancellation request.
  const refreshedPayment = await prisma.payment.findUnique({
    where: { id: payment.id },
  });

  if (!refreshedPayment) {
    throw new BookingCancellationError(
      "Payment record not found.",
      404,
    );
  }

  if (refreshedPayment.status === "FAILED") {
    return cancelWithoutRefund(
      bookingId,
      "FAILED",
    );
  }

  if (refreshedPayment.status === "REFUNDED") {
    return getBookingResult(
      bookingId,
      "REFUNDED",
      false,
      "This reservation has already been refunded and cancelled.",
    );
  }

  if (
    refreshedPayment.status !== "SUCCEEDED" &&
    refreshedPayment.status !== "REFUND_PENDING"
  ) {
    throw new BookingCancellationError(
      "The current payment status does not allow cancellation.",
      409,
    );
  }

  const refreshedPaymentData: RefundBookingData = {
    id: refreshedPayment.id,
    bookingId: refreshedPayment.bookingId,
    userId: booking.userId,
    provider: refreshedPayment.provider,
    status: refreshedPayment.status,
    amount: refreshedPayment.amount,
    currency: refreshedPayment.currency,
    providerPaymentId: refreshedPayment.providerPaymentId,
    providerPaymentIntentId:
      refreshedPayment.providerPaymentIntentId,
    providerRefundId: refreshedPayment.providerRefundId,
    refundAttempt: refreshedPayment.refundAttempt,
  };

  const paymentIntentId =
    await getValidatedPaymentIntent(refreshedPaymentData);

  return requestStripeRefund(
    refreshedPaymentData,
    paymentIntentId,
  );
}
