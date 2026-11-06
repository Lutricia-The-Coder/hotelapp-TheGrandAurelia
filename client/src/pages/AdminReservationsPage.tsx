import type { AdminBooking } from "../api";
import { ToastMessage } from "../components/ToastNotifications";

type AdminReservationsPageProps = {
  adminBookings: AdminBooking[];
  adminBookingsLoading: boolean;
  adminBookingsError: string;
  adminBookingsMessage: string;
  adminActionBookingId: string | null;
  handleAdminBookingStatus: (
    bookingId: string,
    status: "CONFIRMED" | "CANCELLED",
  ) => Promise<void>;
  handleModifyAdminBooking: (booking: AdminBooking) => void;
};

export default function AdminReservationsPage({
  adminBookings,
  adminBookingsLoading,
  adminBookingsError,
  adminBookingsMessage,
  adminActionBookingId,
  handleAdminBookingStatus,
  handleModifyAdminBooking,
}: AdminReservationsPageProps) {
  return (
    <section id="admin-bookings" className="my-bookings-section">
      <h2>Admin Reservations</h2>
      <p>View and manage guest reservations at The Grand Aurelia.</p>

      {adminBookingsLoading && <p>Loading reservations...</p>}

      <ToastMessage message={adminBookingsError} />

      {adminBookingsMessage && (
        <p role="status">{adminBookingsMessage}</p>
      )}

      {!adminBookingsLoading &&
        !adminBookingsError &&
        adminBookings.length === 0 && (
          <p>No reservations found.</p>
        )}

      {!adminBookingsLoading &&
        adminBookings.map((booking) => (
          <article key={booking.id} className="my-booking-card">
            <h3>{booking.roomType.branch.hotel.name}</h3>

            <p>
              <strong>Booking reference:</strong> {booking.id}
            </p>

            <p>
              <strong>Guest:</strong>{" "}
              {booking.user.name || "Guest"}
            </p>

            <p>
              <strong>Email:</strong> {booking.user.email}
            </p>

            <p>
              <strong>Room:</strong> {booking.roomType.name}
            </p>

            <p>
              <strong>Branch:</strong> {booking.roomType.branch.name}
            </p>

            <p>
              <strong>Address:</strong>{" "}
              {booking.roomType.branch.address},{" "}
              {booking.roomType.branch.city}
            </p>

            <p>
              <strong>Check-in:</strong>{" "}
              {new Date(booking.checkIn).toLocaleDateString("en-ZA")}
            </p>

            <p>
              <strong>Check-out:</strong>{" "}
              {new Date(booking.checkOut).toLocaleDateString("en-ZA")}
            </p>

            <p>
              <strong>Adults:</strong> {booking.adults}
            </p>

            <p>
              <strong>Children:</strong> {booking.children}
            </p>

            <p>
              <strong>Rooms:</strong> {booking.roomQuantity}
            </p>

            <p>
              <strong>Total:</strong>{" "}
              {Number(booking.totalPrice).toLocaleString("en-ZA", {
                style: "currency",
                currency: "ZAR",
              })}
            </p>

            <p
              className={`booking-status booking-status-${booking.status.toLowerCase()}`}
            >
              Status:{" "}
              {booking.status === "PENDING"
                ? "Pending confirmation"
                : booking.status === "CONFIRMED"
                  ? "Confirmed"
                  : booking.status === "CANCELLED"
                    ? "Cancelled"
                    : booking.status === "COMPLETED"
                      ? "Completed"
                      : booking.status}
            </p>

            <h4>Payments</h4>

            {booking.payments.length === 0 ? (
              <p>No payment records.</p>
            ) : (
              booking.payments.map((payment) => (
                <p key={payment.id}>
                  {payment.provider}:{" "}
                  {Number(payment.amount).toLocaleString("en-ZA", {
                    style: "currency",
                    currency: payment.currency,
                  })}{" "}
                  — {payment.status}
                </p>
              ))
            )}

            {booking.status === "PENDING" && (
              <button
                type="button"
                className="login-link sign-out-button"
                disabled={adminActionBookingId === booking.id}
                onClick={() =>
                  handleAdminBookingStatus(booking.id, "CONFIRMED")
                }
              >
                Confirm Reservation
              </button>
            )}

            {(booking.status === "PENDING" ||
              booking.status === "CONFIRMED") && (
              <>
                <button
                  type="button"
                  className="login-link sign-out-button"
                  disabled={adminActionBookingId === booking.id}
                  onClick={() => handleModifyAdminBooking(booking)}
                >
                  Modify Reservation
                </button>

                <button
                  type="button"
                  className="login-link sign-out-button"
                  disabled={adminActionBookingId === booking.id}
                  onClick={() =>
                    handleAdminBookingStatus(booking.id, "CANCELLED")
                  }
                >
                  Cancel Reservation
                </button>
              </>
            )}
          </article>
        ))}
    </section>
  );
}
