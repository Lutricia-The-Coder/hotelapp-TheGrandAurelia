
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { UserBooking, BookingResponse } from "../api";

export type BookingConfirmation = NonNullable<BookingResponse["data"]>;

type BookingState = {
  bookings: UserBooking[];
  loading: boolean;
  error: string;
  confirmation: BookingConfirmation | null;
};

const initialState: BookingState = {
  bookings: [],
  loading: false,
  error: "",
  confirmation: null,
};

const bookingSlice = createSlice({
  name: "bookings",
  initialState,
  reducers: {
    setBookings(state, action: PayloadAction<UserBooking[]>) {
      state.bookings = action.payload;
    },
    setBookingsLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setBookingsError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
    setBookingConfirmation(
      state,
      action: PayloadAction<BookingConfirmation | null>,
    ) {
      state.confirmation = action.payload;
    },
    updateBookingStatus(
      state,
      action: PayloadAction<{ bookingId: string; status: string }>,
    ) {
      state.bookings = state.bookings.map((booking) =>
        booking.id === action.payload.bookingId
          ? { ...booking, status: action.payload.status }
          : booking,
      );
    },
    clearBookings(state) {
      state.bookings = [];
      state.loading = false;
      state.error = "";
      state.confirmation = null;
    },
  },
});

export const {
  setBookings,
  setBookingsLoading,
  setBookingsError,
  setBookingConfirmation,
  updateBookingStatus,
  clearBookings,
} = bookingSlice.actions;

export default bookingSlice.reducer;
