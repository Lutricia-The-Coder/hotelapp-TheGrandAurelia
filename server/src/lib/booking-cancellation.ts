import type { Payment } from "@prisma/client";
import prisma from "./prisma.js";

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
type PaystackTransaction = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  metadata?: {
    paymentId?: string;
    bookingId?: string;
    userId?: string;
  } | null;
};

async function verifyPaystackTransaction(
  payment: RefundBookingData,
): Promise<PaystackTransaction> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();

  if (!secretKey || !payment.providerPaymentId) {
    throw new BookingCancellationError(
      "Paystack configuration or transaction reference is missing.",
      409,
    );
  }

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(payment.providerPaymentId)}`,
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

  if (
    !response.ok ||
    !result.status ||
    !result.data ||
    result.data.reference !== payment.providerPaymentId
  ) {
    throw new BookingCancellationError(
      result.message || "Unable to verify Paystack payment.",
      502,
    );
  }

  const transaction = result.data;
  const expectedAmount = Math.round(Number(payment.amount) * 100);

  if (
    transaction.amount !== expectedAmount ||
    transaction.currency.toUpperCase() !== payment.currency.toUpperCase() ||
    transaction.metadata?.paymentId !== payment.id ||
    transaction.metadata?.bookingId !== payment.bookingId ||
    transaction.metadata?.userId !== payment.userId
  ) {
    throw new BookingCancellationError(
      "The Paystack transaction does not match this reservation.",
      409,
    );
  }

  return transaction;
}
async function requestPaystackRefund(
  payment: CancellationPayment,
): Promise<CancellationOutcome> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();

  if (!secretKey || !payment.providerPaymentId) {
    throw new BookingCancellationError(
      "Paystack refund configuration or transaction reference is missing.",
      409,
    );
  }

  let current = await prisma.payment.findUnique({
    where: { id: payment.id },
  });

  if (!current) {
    throw new BookingCancellationError("Payment record not found.", 404);
  }

  if (current.status === "REFUNDED") {
    return getBookingResult(
      current.bookingId,
      "REFUNDED",
      false,
      "This reservation has already been refunded.",
    );
  }

  if (current.status === "SUCCEEDED") {
    const claimed = await prisma.payment.updateMany({
      where: {
        id: current.id,
        status: "SUCCEEDED",
        refundAttempt: current.refundAttempt,
      },
      data: {
        status: "REFUND_PENDING",
        refundAttempt: { increment: 1 },
        providerRefundId: null,
      },
    });

    if (claimed.count !== 1) {
      throw new BookingCancellationError(
        "The refund request is already being processed. Refresh and try again.",
        409,
      );
    }

    current = await prisma.payment.findUnique({
      where: { id: payment.id },
    });
  }

  if (!current || current.status !== "REFUND_PENDING") {
    throw new BookingCancellationError(
      "This payment is not eligible for a refund request.",
      409,
    );
  }

  if (current.providerRefundId) {
    return getBookingResult(
      current.bookingId,
      "REFUND_PENDING",
      true,
      "Your refund has already been requested and is still processing.",
    );
  }

  const response = await fetch("https://api.paystack.co/refund", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction: current.providerPaymentId,
      customer_note: "Refund for cancelled hotel reservation.",
      merchant_note: `Booking ${current.bookingId}`,
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
    throw new BookingCancellationError(
      result.message || "Paystack could not accept the refund request. Manual review may be required.",
      502,
    );
  }

  const refundId = String(result.data.id);

  const saved = await prisma.payment.updateMany({
    where: {
      id: current.id,
      status: "REFUND_PENDING",
      refundAttempt: current.refundAttempt,
      providerRefundId: null,
    },
    data: {
      providerRefundId: refundId,
    },
  });

  if (saved.count !== 1) {
    throw new BookingCancellationError(
      "Paystack accepted the refund, but its reference could not be saved. Manual review is required.",
      409,
    );
  }

  console.log("Paystack refund submitted:", refundId);

  return getBookingResult(
    current.bookingId,
    "REFUND_PENDING",
    true,
    "Your refund has been requested. The reservation will be cancelled once Paystack confirms the refund.",
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
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!booking) {
    throw new BookingCancellationError("Reservation not found.", 404);
  }

  if (requestingUserId && booking.userId !== requestingUserId) {
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
    return cancelWithoutRefund(
      bookingId,
      booking.payments[0]?.status ?? null,
    );
  }

  if (payment.provider !== "paystack") {
    throw new BookingCancellationError(
      "This reservation uses an unsupported payment provider. Contact support.",
      409,
    );
  }

  if (payment.status === "REFUNDED") {
    await prisma.booking.updateMany({
      where: {
        id: bookingId,
        status: { in: ["PENDING", "CONFIRMED", "CANCELLED"] },
      },
      data: { status: "CANCELLED" },
    });

    return getBookingResult(
      bookingId,
      "REFUNDED",
      false,
      "This reservation has already been refunded and cancelled.",
    );
  }

  if (payment.status === "FAILED") {
    return cancelWithoutRefund(bookingId, "FAILED");
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
    providerPaymentIntentId: payment.providerPaymentIntentId,
    providerRefundId: payment.providerRefundId,
    refundAttempt: payment.refundAttempt,
  };

  if (payment.status === "PENDING") {
    const transaction = await verifyPaystackTransaction(paymentData);

    if (transaction.status !== "success") {
      const result = await prisma.$transaction(async (tx) => {
        const bookingUpdate = await tx.booking.updateMany({
          where: {
            id: bookingId,
            status: { in: ["PENDING", "CONFIRMED"] },
          },
          data: { status: "CANCELLED" },
        });

        if (bookingUpdate.count !== 1) {
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

        if (
          transaction.status === "failed" ||
          transaction.status === "abandoned"
        ) {
          await tx.payment.updateMany({
            where: {
              id: payment.id,
              status: "PENDING",
            },
            data: { status: "FAILED" },
          });
        }
      });

      void result;

      return getBookingResult(
        bookingId,
        transaction.status === "failed" ||
          transaction.status === "abandoned"
          ? "FAILED"
          : "PENDING",
        false,
        "Reservation cancelled. If Paystack later confirms the payment, a refund will be requested automatically.",
      );
    }

    const updated = await prisma.payment.updateMany({
      where: {
        id: payment.id,
        status: "PENDING",
      },
      data: { status: "SUCCEEDED" },
    });

    if (updated.count !== 1) {
      const latest = await prisma.payment.findUnique({
        where: { id: payment.id },
      });

      if (
        latest?.status !== "SUCCEEDED" &&
        latest?.status !== "REFUND_PENDING" &&
        latest?.status !== "REFUNDED"
      ) {
        throw new BookingCancellationError(
          "The payment status changed. Refresh the reservation and try again.",
          409,
        );
      }
    }
  }

  const refreshedPayment = await prisma.payment.findUnique({
    where: { id: payment.id },
  });

  if (!refreshedPayment) {
    throw new BookingCancellationError("Payment record not found.", 404);
  }

  if (refreshedPayment.status === "FAILED") {
    return cancelWithoutRefund(bookingId, "FAILED");
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

  const refreshedPaymentData: CancellationPayment = {
    id: refreshedPayment.id,
    bookingId: refreshedPayment.bookingId,
    provider: refreshedPayment.provider,
    status: refreshedPayment.status,
    amount: refreshedPayment.amount,
    currency: refreshedPayment.currency,
    providerPaymentId: refreshedPayment.providerPaymentId,
    providerPaymentIntentId: refreshedPayment.providerPaymentIntentId,
    providerRefundId: refreshedPayment.providerRefundId,
    refundAttempt: refreshedPayment.refundAttempt,
  };

  return requestPaystackRefund(refreshedPaymentData);
}