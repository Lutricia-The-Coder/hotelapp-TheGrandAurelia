import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { RootState } from "../store/store";
import type { RoomType } from "../types/hotel";
import { ToastMessage } from "../components/ToastNotifications";

type BookingPageProps = {
  bookingRoom: RoomType;
  bookingCheckIn: string;
  setBookingCheckIn: Dispatch<SetStateAction<string>>;
  bookingCheckOut: string;
  setBookingCheckOut: Dispatch<SetStateAction<string>>;
  bookingAdults: number;
  setBookingAdults: Dispatch<SetStateAction<number>>;
  bookingChildren: number;
  setBookingChildren: Dispatch<SetStateAction<number>>;
  bookingQuantity: number;
  setBookingQuantity: Dispatch<SetStateAction<number>>;
  bookingError: string;
  bookingMessage: string;
  bookingConfirmation: RootState["bookings"]["confirmation"];
  bookingLoading: boolean;
  isAuthenticated: boolean;
  handleBookingSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleClose: () => void;
};

export default function BookingPage({
  bookingRoom,
  bookingCheckIn,
  setBookingCheckIn,
  bookingCheckOut,
  setBookingCheckOut,
  bookingAdults,
  setBookingAdults,
  bookingChildren,
  setBookingChildren,
  bookingQuantity,
  setBookingQuantity,
  bookingError,
  bookingMessage,
  bookingConfirmation,
  bookingLoading,
  isAuthenticated,
  handleBookingSubmit,
  handleClose,
}: BookingPageProps) {
  return (
    <section className="auth-section" id="booking-form">
      <div className="auth-card booking-card">
        <button
          type="button"
          className="auth-close"
          onClick={handleClose}
          aria-label="Close booking form"
        >
          ×
        </button>

        <p className="eyebrow">
          <span /> THE GRAND AURELIA
        </p>

        <h2>
          Book your <em>stay.</em>
        </h2>

        <p className="auth-description">
          {bookingRoom.name} · R
          {bookingRoom.pricePerNight.toLocaleString("en-ZA")} per night
        </p>

        <form onSubmit={handleBookingSubmit}>
          <label className="auth-label">
            Check-in
            <input
              type="date"
              value={bookingCheckIn}
              onChange={(event) => setBookingCheckIn(event.target.value)}
              min={new Date().toLocaleDateString("en-CA")}
              required
            />
          </label>

          <label className="auth-label">
            Check-out
            <input
              type="date"
              value={bookingCheckOut}
              onChange={(event) => setBookingCheckOut(event.target.value)}
              min={bookingCheckIn || new Date().toLocaleDateString("en-CA")}
              required
            />
          </label>

          <label className="auth-label">
            Adults
            <input
              type="number"
              min={1}
              max={bookingRoom.capacity * bookingQuantity}
              value={bookingAdults}
              onChange={(event) => setBookingAdults(Number(event.target.value))}
              required
            />
          </label>

          <label className="auth-label">
            Children
            <input
              type="number"
              min={0}
              value={bookingChildren}
              onChange={(event) => setBookingChildren(Number(event.target.value))}
              required
            />
          </label>

          <label className="auth-label">
            Rooms
            <select
              value={bookingQuantity}
              onChange={(event) => setBookingQuantity(Number(event.target.value))}
              required
            >
              {Array.from(
                { length: bookingRoom.totalRooms },
                (_, index) => index + 1,
              ).map((quantity) => (
                <option key={quantity} value={quantity}>
                  {quantity} {quantity === 1 ? "room" : "rooms"}
                </option>
              ))}
            </select>
          </label>

          {bookingCheckIn &&
            bookingCheckOut &&
            bookingCheckOut > bookingCheckIn && (
              <p className="auth-description">
                Estimated total: R
                {(
                  bookingRoom.pricePerNight *
                  Math.round(
                    (new Date(`${bookingCheckOut}T00:00:00`).getTime() -
                      new Date(`${bookingCheckIn}T00:00:00`).getTime()) /
                      86400000,
                  ) *
                  bookingQuantity
                ).toLocaleString("en-ZA")}
              </p>
            )}

          <ToastMessage message={bookingError} />

          {bookingMessage && (
            <div className="booking-confirmation" role="status">
              <p className="auth-feedback auth-feedback-success">
                {bookingMessage}
              </p>

              {bookingConfirmation && (
                <div className="booking-confirmation-details">
                  <h3>Booking Confirmation</h3>

                  <p>
                    <strong>Booking reference:</strong>{" "}
                    {bookingConfirmation.id}
                  </p>

                  <p>
                    <strong>Room:</strong>{" "}
                    {bookingRoom.name ?? "Selected room"}
                  </p>

                  <p>
                    <strong>Check-in:</strong>{" "}
                    {new Date(bookingConfirmation.checkIn).toLocaleDateString(
                      "en-ZA",
                    )}
                  </p>

                  <p>
                    <strong>Check-out:</strong>{" "}
                    {new Date(bookingConfirmation.checkOut).toLocaleDateString(
                      "en-ZA",
                    )}
                  </p>

                  <p>
                    <strong>Rooms booked:</strong> {bookingQuantity}
                  </p>

                  <p>
                    <strong>Total price:</strong>{" "}
                    {Number(bookingConfirmation.totalPrice).toLocaleString(
                      "en-ZA",
                      {
                        style: "currency",
                        currency: "ZAR",
                      },
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {!isAuthenticated && (
            <p className="auth-description">
              You'll need to sign in before confirming your booking.
            </p>
          )}

          <button
            type="submit"
            className="gold-button auth-submit"
            disabled={bookingLoading}
          >
            {bookingLoading ? "Creating booking..." : "Confirm booking"}
          </button>
        </form>
      </div>
    </section>
  );
}
