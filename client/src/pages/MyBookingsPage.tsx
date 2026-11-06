import type { RootState } from "../store/store";
import { ToastMessage } from "../components/ToastNotifications";

type Booking = RootState["bookings"]["bookings"][number];

type MyBookingsPageProps = {
  myBookings: Booking[];
  myBookingsLoading: boolean;
  myBookingsError: string;
  cancellationMessage: string;
  cancellingBookingId: string | null;
  handleCancelBooking: (bookingId: string) => void;
};

export default function MyBookingsPage({
  myBookings,
  myBookingsLoading,
  myBookingsError,
  cancellationMessage,
  cancellingBookingId,
  handleCancelBooking,
}: MyBookingsPageProps) {
  const confirmedBookings = myBookings.filter(
    (booking) => booking.status === "CONFIRMED",
  );

  return (
    <section id="my-bookings" className="my-bookings-section my-bookings-page">
      <header className="my-bookings-heading">
        <p className="my-bookings-eyebrow">YOUR ACCOUNT</p>
        <h2>My Bookings</h2>
        <p>Your reservations at The Grand Aurelia.</p>
      </header>

      {cancellationMessage && (
        <p role="status" className="booking-cancellation-message">
          {cancellationMessage}
        </p>
      )}

      {myBookingsLoading && <p>Loading your bookings...</p>}

      <ToastMessage message={myBookingsError} />

      {!myBookingsLoading &&
        !myBookingsError &&
        confirmedBookings.length === 0 && (
          <div className="bookings-empty-state">
            <img
              src="/images/empty-bookings.png"
              alt="An empty folder showing zero bookings"
              width="324"
              height="276"
            />
            <h3>No confirmed stays yet</h3>
            <p>Your confirmed reservations will appear here when you book a stay.</p>
          </div>
        )}

      {!myBookingsLoading &&
        !myBookingsError &&
        confirmedBookings.map((booking) => (
          <article key={booking.id} className="my-booking-card">
            <h3>{booking.roomType.name}</h3>
            <p>Hotel: {booking.roomType.branch.hotel.name}</p>
            <p>Branch: {booking.roomType.branch.name}</p>
            <p>
              Check-in:{" "}
              {new Date(booking.checkIn).toLocaleDateString("en-ZA")}
            </p>
            <p>
              Check-out:{" "}
              {new Date(booking.checkOut).toLocaleDateString("en-ZA")}
            </p>
            <p>Rooms: {booking.roomQuantity}</p>
            <p>
              Total:{" "}
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

            {booking.status !== "CANCELLED" &&
              booking.status !== "COMPLETED" && (
                <button
                  type="button"
                  className="login-link sign-out-button"
                  onClick={() => handleCancelBooking(booking.id)}
                  disabled={cancellingBookingId === booking.id}
                >
                  {cancellingBookingId === booking.id
                    ? "Cancelling..."
                    : "Cancel Booking"}
                </button>
              )}
          </article>
        ))}
    </section>
  );
}
